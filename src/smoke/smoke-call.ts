// One-shot Anthropic smoke call (DEC-0020). Executes EXACTLY ONE real provider
// request under an immutable, Product Owner-signed live-provider-call-request
// consumed exactly once. This is a deliberately separate path from the general
// gateway adapter: it has NO retry loop, enforces attempt == 1, and permits the
// call without standing live invocation (which stays disabled) — the single
// consumed live-provider-call authorization is the entire warrant.
//
// Fixed fail-closed gate order, each step gated on all prior steps:
//   1. request validation   — provider/model/data-class, digest binding to the
//                             active candidate and gateway policy, validity
//                             window, deliberately small token allowances, and
//                             worst-case cost <= the USD 0.25 ceremony ceiling
//                             (the standing per-request ceiling still applies)
//   2. authorization check   — a valid, unexpired live-provider-call approval
//                             bound to this exact request digest (consumes nothing)
//   3. budget reservation    — conservative maximum cost, atomically reserved
//   4. authorization consume  — atomic single-use
//   5. credential resolution — approved secret boundary only, after every
//                             non-secret gate
//   6. one transport call    — bounded, abortable, NO retry
//   7. response validation   — untrusted until content-type/size/JSON/model/
//                             usage/content-block/output-contract validation
//
// No prompt, response body, header, or credential ever appears in the result,
// a failure, or a log. On any failure there is no retry: the outcome is a
// truthful sanitized provider-smoke-result with status "failed" and the
// budget is settled conservatively.
import { costCents, parseSuccessResponse, safeRequestId } from "../gateway/adapters/anthropic.js";
import type { FileBudgetLedger } from "../gateway/adapters/budget-ledger.js";
import type { LiveCallAuthorization } from "../gateway/adapters/live-authorization.js";
import type { ProviderPolicy } from "../gateway/adapters/provider-policy.js";
import type { ProviderSecretResolver } from "../gateway/adapters/secret.js";
import { ATTEMPT_TIMEOUT_MS, MAX_REQUEST_BODY_BYTES } from "../gateway/adapters/anthropic.js";
import type { AnthropicTransport } from "../gateway/adapters/transport.js";
import { contentDigest } from "../kernel/canonical-json.js";
import { type Result, err, ok } from "../kernel/result.js";

/** Standing per-request USD ceiling from DEC-0018 (cents); the ceremony ceiling is stricter. */
export const GLOBAL_PER_REQUEST_CENTS = 100;
/** The ceremony authorization ceiling (cents). */
export const CEREMONY_CENTS = 25;

export interface SmokeCallDeps {
  /** The contract-validated, digest-consistent live-provider-call-request. */
  request: Record<string, unknown>;
  /** The trusted, digest-bound provider policy loaded through the fixed boundary. */
  policy: ProviderPolicy;
  /** Verifier-backed authorization bound to this request's content digest. */
  liveAuthorization: LiveCallAuthorization;
  ledger: FileBudgetLedger;
  secretResolver: ProviderSecretResolver;
  transport: AnthropicTransport;
  clock: () => string;
  /** The synthetic prompt for the single declared fixture. */
  scenarioPrompt: string;
  /** Raw JSON Schema for the trivial structured-output contract. */
  outputSchema: Record<string, unknown>;
  /** Validates the extracted structured output against the smoke output contract. */
  validateOutput: (artifact: unknown) => Result<Record<string, unknown>>;
}

export interface SmokeOutcome {
  /** The sanitized provider-smoke-result artifact (status succeeded or failed). */
  result: Record<string, unknown>;
  /** The authorization consumption receipt id (present once consumed). */
  receiptId: string | null;
}

export type SmokeFailureReason =
  | "request-not-authorized-shape"
  | "candidate-binding-mismatch"
  | "gateway-policy-binding-mismatch"
  | "model-not-authorized"
  | "data-class-not-authorized"
  | "validity-window-lapsed"
  | "cost-ceiling-exceeded"
  | "authorization-invalid"
  | "budget-refused"
  | "credential-unavailable"
  | "transport-timeout"
  | "transport-unavailable"
  | "provider-http-error"
  | "protocol-violation"
  | "output-contract-invalid";

const round2 = (v: number): number => Math.round(v * 100) / 100;

export class SmokeCallService {
  #secretResolutions = 0;
  #transportCalls = 0;

  get secretResolutionCount(): number {
    return this.#secretResolutions;
  }
  get transportCallCount(): number {
    return this.#transportCalls;
  }

  /**
   * Run the single authorized smoke call. Returns a provider-smoke-result in
   * every terminal case (never throws across the boundary). A pre-authorization
   * refusal returns a failed result with `receiptId: null` and no consumption.
   */
  async run(deps: SmokeCallDeps): Promise<Result<SmokeOutcome>> {
    const req = deps.request;
    const workspace = String(req["workspace"]);
    const brandRef = String(req["brand_ref"]);
    const requestRef = String(req["artifact_id"]);
    const requestContentDigest = contentDigest(req);
    const startedAt = deps.clock();

    const failed = (reason: SmokeFailureReason, message: string, receiptId: string | null = null): Result<SmokeOutcome> => {
      const result = this.#buildResult({
        workspace,
        brandRef,
        requestRef,
        requestContentDigest,
        receiptId,
        returnedModel: null,
        providerRequestId: null,
        status: "failed",
        failureReason: reason,
        inputTokens: null,
        outputTokens: null,
        reservedUsd: 0,
        settledUsd: 0,
        outputContract: String(req["expected_output_contract"]),
        outputArtifactDigest: null,
        startedAt,
      });
      // The reason string is the classification; the message is not persisted.
      void message;
      return ok({ result, receiptId });
    };

    // --- 1. Request validation (binds this exact request to the active docs) ---
    if (req["provider"] !== "anthropic") return failed("request-not-authorized-shape", "provider must be anthropic");
    if (req["data_classification"] !== "synthetic")
      return failed("data-class-not-authorized", "data class must be synthetic");
    const model = String(req["model_id"]);
    const allowed = deps.policy.allowedModels.find((m) => m.modelId === model);
    if (!allowed || model !== "claude-haiku-4-5-20251001")
      return failed("model-not-authorized", "only claude-haiku-4-5-20251001 is authorized for the smoke call");
    if (req["provider_policy_candidate_digest"] !== deps.policy.candidateContentDigest)
      return failed("candidate-binding-mismatch", "request candidate digest does not bind the active signed candidate");
    if (req["gateway_policy_digest"] !== contentDigest(deps.policy.gatewayPolicy))
      return failed("gateway-policy-binding-mismatch", "request gateway-policy digest does not bind the active gateway policy");
    const nowMs = Date.parse(deps.clock());
    if (nowMs < Date.parse(String(req["valid_from"])) || nowMs >= Date.parse(String(req["valid_until"])))
      return failed("validity-window-lapsed", "the live-call request is outside its validity window");

    const maxInput = req["max_input_tokens"] as number;
    const maxOutput = req["max_output_tokens"] as number;
    const reservationCents = costCents(allowed, maxInput, maxOutput);
    // The ceremony ceiling (0.25) and the standing per-request ceiling (1.00)
    // both apply; the stricter one governs.
    if (reservationCents > CEREMONY_CENTS)
      return failed("cost-ceiling-exceeded", `worst-case ${reservationCents}c exceeds the ${CEREMONY_CENTS}c ceremony ceiling`);
    if (reservationCents > GLOBAL_PER_REQUEST_CENTS)
      return failed("cost-ceiling-exceeded", "worst-case cost exceeds the standing per-request ceiling");

    const body = JSON.stringify({
      model,
      max_tokens: maxOutput,
      messages: [{ role: "user", content: deps.scenarioPrompt }],
      output_config: { format: { type: "json_schema", schema: deps.outputSchema } },
    });
    if (Buffer.byteLength(body, "utf8") > MAX_REQUEST_BODY_BYTES)
      return failed("request-not-authorized-shape", "request body exceeds the bound");

    // --- 2. Authorization presence/validity (consumes nothing) ---------------
    const authCheck = deps.liveAuthorization.check();
    if (!authCheck.ok) return failed("authorization-invalid", "live-call authorization is missing, invalid, or expired");

    // --- 3. Conservative budget reservation ----------------------------------
    const reserved = deps.ledger.reserve(
      { runId: requestRef, requestId: requestRef, attempt: 1, maxCents: reservationCents },
      deps.clock()
    );
    if (!reserved.ok) return failed("budget-refused", reserved.message);
    const reservationId = reserved.value.reservationId;

    // --- 4. Atomic single-use authorization consumption ----------------------
    const consumed = deps.liveAuthorization.consume();
    if (!consumed.ok) {
      deps.ledger.settle(reservationId, 0);
      return failed("authorization-invalid", "live-call authorization failed verification/consumption");
    }
    const receiptId = consumed.value.authorizationRef;

    // --- 5. Credential resolution (after every non-secret gate) --------------
    this.#secretResolutions += 1;
    const secret = await deps.secretResolver.resolve();
    if (!secret.ok) {
      deps.ledger.settle(reservationId, 0);
      return failed("credential-unavailable", secret.message, receiptId);
    }

    // --- 6. Exactly ONE transport call, no retry -----------------------------
    this.#transportCalls += 1;
    const transported = await deps.transport.post({
      bodyJson: body,
      apiKey: secret.value.apiKey,
      apiVersion: deps.policy.apiVersion,
      timeoutMs: ATTEMPT_TIMEOUT_MS,
    });

    if (!transported.ok) {
      // Usage unknowable — settle conservatively at the full reservation.
      const settled = deps.ledger.settle(reservationId, "unknown");
      const charged = settled.ok ? settled.value.chargedCents : reservationCents;
      const reason: SmokeFailureReason =
        transported.failure.kind === "transport-timeout" ? "transport-timeout" : "transport-unavailable";
      return ok({
        result: this.#buildResult({
          workspace, brandRef, requestRef, requestContentDigest, receiptId,
          returnedModel: null, providerRequestId: null, status: "failed", failureReason: reason,
          inputTokens: null, outputTokens: null, reservedUsd: reservationCents / 100, settledUsd: charged / 100,
          outputContract: String(req["expected_output_contract"]), outputArtifactDigest: null, startedAt,
        }),
        receiptId,
      });
    }

    const response = transported.response;
    const providerRequestId = safeRequestId(response.requestId);

    if (response.status !== 200) {
      // Clean HTTP error: no generation — settle at zero.
      deps.ledger.settle(reservationId, 0);
      return ok({
        result: this.#buildResult({
          workspace, brandRef, requestRef, requestContentDigest, receiptId,
          returnedModel: null, providerRequestId, status: "failed", failureReason: "provider-http-error",
          inputTokens: null, outputTokens: null, reservedUsd: reservationCents / 100, settledUsd: 0,
          outputContract: String(req["expected_output_contract"]), outputArtifactDigest: null, startedAt,
        }),
        receiptId,
      });
    }

    const parsed = parseSuccessResponse(response, model);
    if (!parsed.ok) {
      const settled = deps.ledger.settle(reservationId, "unknown");
      const charged = settled.ok ? settled.value.chargedCents : reservationCents;
      return ok({
        result: this.#buildResult({
          workspace, brandRef, requestRef, requestContentDigest, receiptId,
          returnedModel: null, providerRequestId, status: "failed", failureReason: "protocol-violation",
          inputTokens: null, outputTokens: null, reservedUsd: reservationCents / 100, settledUsd: charged / 100,
          outputContract: String(req["expected_output_contract"]), outputArtifactDigest: null, startedAt,
        }),
        receiptId,
      });
    }

    // Provider-reported usage above the declared maxima is inconsistent with
    // the request the ceremony sent — reject and settle at the full reservation.
    if (parsed.value.inputTokens > maxInput || parsed.value.outputTokens > maxOutput) {
      const settled = deps.ledger.settle(reservationId, "unknown");
      const charged = settled.ok ? settled.value.chargedCents : reservationCents;
      return ok({
        result: this.#buildResult({
          workspace, brandRef, requestRef, requestContentDigest, receiptId,
          returnedModel: parsed.value.returnedModel, providerRequestId, status: "failed",
          failureReason: "protocol-violation", inputTokens: null, outputTokens: null,
          reservedUsd: reservationCents / 100, settledUsd: charged / 100,
          outputContract: String(req["expected_output_contract"]), outputArtifactDigest: null, startedAt,
        }),
        receiptId,
      });
    }

    const actualCents = costCents(allowed, parsed.value.inputTokens, parsed.value.outputTokens);
    const settled = deps.ledger.settle(reservationId, actualCents);
    const charged = settled.ok ? settled.value.chargedCents : reservationCents;

    const validated = deps.validateOutput(parsed.value.artifact);
    if (!validated.ok) {
      // No retry: a contract-invalid smoke response is a failed ceremony.
      return ok({
        result: this.#buildResult({
          workspace, brandRef, requestRef, requestContentDigest, receiptId,
          returnedModel: parsed.value.returnedModel, providerRequestId, status: "failed",
          failureReason: "output-contract-invalid", inputTokens: parsed.value.inputTokens,
          outputTokens: parsed.value.outputTokens, reservedUsd: reservationCents / 100, settledUsd: charged / 100,
          outputContract: String(req["expected_output_contract"]), outputArtifactDigest: null, startedAt,
        }),
        receiptId,
      });
    }

    // --- 7. Success ----------------------------------------------------------
    return ok({
      result: this.#buildResult({
        workspace, brandRef, requestRef, requestContentDigest, receiptId,
        returnedModel: parsed.value.returnedModel, providerRequestId, status: "succeeded",
        failureReason: null, inputTokens: parsed.value.inputTokens, outputTokens: parsed.value.outputTokens,
        reservedUsd: reservationCents / 100, settledUsd: charged / 100,
        outputContract: String(req["expected_output_contract"]),
        outputArtifactDigest: contentDigest(validated.value), startedAt,
      }),
      receiptId,
    });
  }

  #buildResult(f: {
    workspace: string;
    brandRef: string;
    requestRef: string;
    requestContentDigest: string;
    receiptId: string | null;
    returnedModel: string | null;
    providerRequestId: string | null;
    status: "succeeded" | "failed";
    failureReason: string | null;
    inputTokens: number | null;
    outputTokens: number | null;
    reservedUsd: number;
    settledUsd: number;
    outputContract: string;
    outputArtifactDigest: string | null;
    startedAt: string;
  }): Record<string, unknown> {
    return {
      schema_version: "1.10.0",
      artifact_id: `psr-${f.requestRef}`,
      workspace: f.workspace,
      brand_ref: f.brandRef,
      created_at: f.startedAt,
      live_call_request_ref: f.requestRef,
      live_call_request_digest: f.requestContentDigest,
      live_call_receipt_ref: f.receiptId,
      provider: "anthropic",
      requested_model: "claude-haiku-4-5-20251001",
      returned_model: f.returnedModel,
      provider_request_id: f.providerRequestId,
      attempt: 1,
      retry_count: 0,
      status: f.status,
      failure_reason: f.failureReason,
      input_tokens: f.inputTokens,
      output_tokens: f.outputTokens,
      cached_tokens: 0,
      cache_creation_tokens: 0,
      reserved_usd: round2(f.reservedUsd),
      settled_usd: round2(f.settledUsd),
      pricing_version: "anthropic-official-2026-07-19-post-intro",
      retention_status: "STANDARD_UP_TO_30_DAYS",
      output_contract: f.outputContract,
      output_artifact_digest: f.outputArtifactDigest,
      started_at: f.startedAt,
    };
  }
}
