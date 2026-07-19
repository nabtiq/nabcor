// Anthropic raw-HTTPS adapter (DEC-0018 Option A, DEC-0019; threat model
// T01/T02/T03/T09/T13/T14/T15/T16/T21). Sits behind the provider-neutral
// gateway: the gateway has already contract-validated the request, enforced
// the adapter/data-class/tier policy, checked the token budget, and persisted
// the context manifest. This adapter enforces the provider-specific gates in
// a fixed fail-closed order:
//
//   1. request validation   — known scenario, allowed data class, exact
//                             allowed model resolved from the tier, token
//                             maxima within the signed candidate's ceilings,
//                             bounded request body
//   2. live-invocation gate — the committed operational state must enable
//                             live invocation (schema-impossible this phase)
//   3. authorization check  — a valid, unexpired, candidate-bound live-call
//                             approval must be present (consumes nothing)
//   4. budget reservation   — conservative maximum cost from the pinned
//                             price table and requested token maxima,
//                             atomically reserved per attempt
//   5. authorization consume — atomic single-use (first attempt only)
//   6. credential resolution — approved secret boundary only; never before
//                             steps 1-5
//   7. transport            — pinned endpoint, bounded, abortable, at most
//                             two total attempts, retry only explicitly
//                             classified transient failures
//
// Every response is untrusted until parsed, bounded, model-checked, and the
// extracted structured output validates against the requested NABCor
// contract. No request or response body, header, or credential ever appears
// in a typed failure, record, or log. Provider-reported usage settles each
// reservation; unknown usage (timeout) settles at the full reservation —
// conservative, never released.
import { type Result, err, ok } from "../../kernel/result.js";
import type {
  AdapterInvocation,
  AdapterResult,
  GatewayAdapter,
  ProviderAccounting,
} from "../adapter.js";
import type { FileBudgetLedger } from "./budget-ledger.js";
import type { LiveCallAuthorization } from "./live-authorization.js";
import type { AllowedModel, ProviderPolicy } from "./provider-policy.js";
import type { ProviderSecretResolver } from "./secret.js";
import type { AnthropicTransport, TransportResponse } from "./transport.js";

/** Upper bound on the serialized request body (threat T13: bounded requests). */
export const MAX_REQUEST_BODY_BYTES = 1_000_000;
/** Abortable per-attempt timeout. */
export const ATTEMPT_TIMEOUT_MS = 120_000;
/** A retry-after beyond this bound fails instead of waiting (threat T14). */
export const MAX_RETRY_AFTER_SECONDS = 30;

export interface AnthropicAdapterDeps {
  policy: ProviderPolicy;
  transport: AnthropicTransport;
  secretResolver: ProviderSecretResolver;
  ledger: FileBudgetLedger;
  liveAuthorization: LiveCallAuthorization;
  /** Injected ISO 8601 clock (UTC day/month attribution, expiry checks). */
  clock: () => string;
  /** Injected sleeper so retry backoff is deterministic under test. */
  sleep: (ms: number) => Promise<void>;
  /** Synthetic scenario prompts; unknown scenarios are rejected, never improvised. */
  scenarioPrompts: ReadonlyMap<string, string>;
  /** Raw JSON Schema for the requested output contract (constrained decoding). */
  outputSchemaFor: (outputContract: string) => Record<string, unknown> | undefined;
  /** NABCor contract validation for the extracted structured output. */
  validateOutput: (outputContract: string, artifact: unknown) => Result<Record<string, unknown>>;
}

interface ParsedSuccess {
  artifact: unknown;
  returnedModel: string;
  inputTokens: number;
  outputTokens: number;
  requestId: string | null;
}

/** Integer-cent conservative cost: ceil((in*inCents + out*outCents) / 1e6). */
export function costCents(model: AllowedModel, inputTokens: number, outputTokens: number): number {
  const numerator =
    inputTokens * Math.round(model.inputUsdPerMtok * 100) +
    outputTokens * Math.round(model.outputUsdPerMtok * 100);
  return Math.ceil(numerator / 1_000_000);
}

export class AnthropicAdapter implements GatewayAdapter {
  readonly adapterId = "anthropic";
  readonly provider = "anthropic";
  readonly modelLabel = "anthropic-messages-adapter-v1";
  readonly executionTiers = [1, 2] as const;

  readonly #deps: AnthropicAdapterDeps;
  #secretResolutions = 0;
  #transportAttempts = 0;

  constructor(deps: AnthropicAdapterDeps) {
    this.#deps = deps;
  }

  /** Test seams proving gate ordering: counters that only move past their gate. */
  get secretResolutionCount(): number {
    return this.#secretResolutions;
  }
  get transportAttemptCount(): number {
    return this.#transportAttempts;
  }

  async invoke(invocation: AdapterInvocation): Promise<AdapterResult> {
    const policy = this.#deps.policy;

    // --- 1. Request validation (no side effects) --------------------------
    if (!policy.allowedDataClasses.has(invocation.dataClassification)) {
      return this.#fail(null, {
        kind: "data-class-not-permitted",
        dataClass: invocation.dataClassification,
        message: `data classification '${invocation.dataClassification}' is not in the signed candidate's allowlist`,
      });
    }
    const model = policy.allowedModels.find((m) => m.tier === invocation.requestedTier);
    if (!model) {
      return this.#fail(null, {
        kind: "model-not-allowed",
        requestedTier: invocation.requestedTier,
        message: `no allowed model serves tier ${invocation.requestedTier}; the exact model allowlist is signed and closed`,
      });
    }
    if (
      !Number.isInteger(invocation.maxOutputTokens) ||
      invocation.maxOutputTokens < 1 ||
      invocation.maxOutputTokens > policy.maxOutputTokensPerRequest
    ) {
      return this.#fail(null, {
        kind: "budget-exceeded",
        message: `declared max_output_tokens ${invocation.maxOutputTokens} is outside (0, ${policy.maxOutputTokensPerRequest}]`,
      });
    }
    if (
      invocation.maxInputTokens === null ||
      !Number.isInteger(invocation.maxInputTokens) ||
      invocation.maxInputTokens < 1 ||
      invocation.maxInputTokens > policy.maxInputTokensPerRequest
    ) {
      return this.#fail(null, {
        kind: "budget-exceeded",
        message: `a declared fresh-input token maximum in (0, ${policy.maxInputTokensPerRequest}] is required for conservative cost reservation`,
      });
    }
    const prompt = this.#deps.scenarioPrompts.get(invocation.scenarioId);
    if (prompt === undefined) {
      return this.#fail(null, {
        kind: "scenario-not-found",
        scenarioId: invocation.scenarioId,
        message: `no synthetic scenario prompt exists for '${invocation.scenarioId}'; unknown scenarios are rejected, never improvised`,
      });
    }
    const outputSchema = this.#deps.outputSchemaFor(invocation.outputContract);
    if (outputSchema === undefined) {
      return this.#fail(null, {
        kind: "output-validation-failed",
        artifactType: invocation.outputContract,
        issues: [],
        message: `no schema exists for output contract '${invocation.outputContract}'`,
      });
    }
    const body = JSON.stringify({
      model: model.modelId,
      max_tokens: invocation.maxOutputTokens,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: { type: "json_schema", schema: outputSchema } },
    });
    if (Buffer.byteLength(body, "utf8") > MAX_REQUEST_BODY_BYTES) {
      return this.#fail(null, {
        kind: "provider-request-rejected",
        message: `serialized request body exceeds the ${MAX_REQUEST_BODY_BYTES}-byte bound`,
      });
    }
    // The USD ceiling governs even when both token ceilings pass: a request
    // whose token maxima project above the per-request cap is rejected.
    const reservationCents = costCents(model, invocation.maxInputTokens, invocation.maxOutputTokens);

    // --- 2. Live-invocation gate (fail-closed; schema-pinned off) ---------
    if (!policy.liveInvocationEnabled) {
      return this.#fail(null, {
        kind: "live-invocation-disabled",
        message:
          "live provider invocation is disabled (CONFIGURED_BUT_LIVE_DISABLED): the committed provider-operational-state pins live_invocation_enabled false pending the secret-provisioning ceremony and a separately signed smoke-call approval",
      });
    }

    // --- 3. Authorization presence/validity (consumes nothing) -----------
    const authCheck = this.#deps.liveAuthorization.check();
    if (!authCheck.ok) {
      return this.#fail(null, authCheck.error);
    }

    // --- Attempt loop: at most maxAttemptsPerRequest total attempts -------
    const accounting: ProviderAccounting = {
      provider: "anthropic",
      requestedModel: model.modelId,
      returnedModel: null,
      modelTier: model.tier,
      providerRequestId: null,
      attempt: 0,
      retryCount: 0,
      inputTokens: null,
      outputTokens: null,
      cachedTokens: null,
      cacheCreationTokens: null,
      reservedUsd: 0,
      actualUsd: null,
      pricingVersion: policy.pricingVersion,
      budgetRemainingUsd: null,
      retentionStatus: "STANDARD_UP_TO_30_DAYS",
      liveAuthorizationRef: null,
    };
    let apiKey: string | null = null;
    let chargedCentsTotal = 0;
    let lastFailure: Result<unknown> | null = null;

    for (let attempt = 1; attempt <= policy.maxAttemptsPerRequest; attempt++) {
      accounting.attempt = attempt;
      accounting.retryCount = attempt - 1;

      // --- 4. Conservative budget reservation (every attempt) ------------
      const nowIso = this.#deps.clock();
      const reserved = this.#deps.ledger.reserve(
        {
          runId: invocation.runId,
          requestId: invocation.requestId,
          attempt,
          maxCents: reservationCents,
        },
        nowIso
      );
      if (!reserved.ok) {
        if (attempt === 1) {
          // First-attempt budget refusal: nothing consumed, no secret lookup.
          return this.#fail(null, { kind: reserved.kind, message: reserved.message });
        }
        // Retry blocked by budget: report the prior attempt's failure.
        this.#applyRemaining(accounting, invocation.runId);
        return { outcome: lastFailure as Result<unknown>, accounting };
      }
      accounting.reservedUsd = round2(accounting.reservedUsd + reservationCents / 100);
      const reservationId = reserved.value.reservationId;

      // --- 5. Atomic single-use authorization consumption (first attempt) -
      if (attempt === 1) {
        const consumed = this.#deps.liveAuthorization.consume();
        if (!consumed.ok) {
          this.#deps.ledger.settle(reservationId, 0);
          this.#applyRemaining(accounting, invocation.runId);
          return { outcome: err(consumed.error), accounting };
        }
        accounting.liveAuthorizationRef = consumed.value.authorizationRef;
      }

      // --- 6. Credential resolution (after every non-secret gate) --------
      if (apiKey === null) {
        this.#secretResolutions += 1;
        const secret = await this.#deps.secretResolver.resolve();
        if (!secret.ok) {
          this.#deps.ledger.settle(reservationId, 0);
          this.#applyRemaining(accounting, invocation.runId);
          return {
            outcome: err({ kind: "credential-unavailable", message: secret.message }),
            accounting,
          };
        }
        apiKey = secret.value.apiKey;
      }

      // --- 7. Bounded transport attempt -----------------------------------
      this.#transportAttempts += 1;
      const transported = await this.#deps.transport.post({
        bodyJson: body,
        apiKey,
        apiVersion: policy.apiVersion,
        timeoutMs: ATTEMPT_TIMEOUT_MS,
      });

      if (!transported.ok) {
        // Timeout / network / oversized: usage unknowable — settle at the
        // full reservation (conservative; threat T16) and classify.
        const settled = this.#deps.ledger.settle(reservationId, "unknown");
        if (settled.ok) chargedCentsTotal += settled.value.chargedCents;
        const kind =
          transported.failure.kind === "transport-timeout"
            ? ("provider-timeout" as const)
            : transported.failure.kind === "transport-response-too-large"
              ? ("provider-protocol-violation" as const)
              : ("provider-unavailable" as const);
        lastFailure = err({ kind, message: transported.failure.message });
        const retryable = kind !== "provider-protocol-violation";
        if (retryable && attempt < policy.maxAttemptsPerRequest) {
          await this.#deps.sleep(1000);
          continue;
        }
        this.#finishActual(accounting, chargedCentsTotal, invocation.runId);
        return { outcome: lastFailure, accounting };
      }

      const response = transported.response;
      accounting.providerRequestId = response.requestId ?? accounting.providerRequestId;

      if (response.status !== 200) {
        // Clean HTTP error envelope: the provider generated nothing; the
        // reservation settles at zero (provably unconsumed generation).
        const settled = this.#deps.ledger.settle(reservationId, 0);
        if (settled.ok) chargedCentsTotal += settled.value.chargedCents;
        const classified = classifyHttpFailure(response);
        lastFailure = err(classified.failure);
        if (classified.retryable && attempt < policy.maxAttemptsPerRequest) {
          const waitSeconds = response.retryAfterSeconds;
          if (waitSeconds !== null && waitSeconds > MAX_RETRY_AFTER_SECONDS) {
            this.#finishActual(accounting, chargedCentsTotal, invocation.runId);
            return { outcome: lastFailure, accounting };
          }
          await this.#deps.sleep((waitSeconds ?? 1) * 1000);
          continue;
        }
        this.#finishActual(accounting, chargedCentsTotal, invocation.runId);
        return { outcome: lastFailure, accounting };
      }

      const parsed = parseSuccessResponse(response, model.modelId);
      if (!parsed.ok) {
        // The response arrived but is untrustworthy; usage may exist —
        // settle conservatively at the full reservation, never retry a
        // protocol violation.
        const settled = this.#deps.ledger.settle(reservationId, "unknown");
        if (settled.ok) chargedCentsTotal += settled.value.chargedCents;
        lastFailure = err(parsed.error);
        this.#finishActual(accounting, chargedCentsTotal, invocation.runId);
        return { outcome: lastFailure, accounting };
      }

      // Usage above the declared maxima is inconsistent with the request the
      // adapter sent: the conservative reservation would no longer bound the
      // real cost, so the response is rejected and the attempt settles at the
      // full reservation (never a silent under-charge).
      if (
        parsed.value.inputTokens > invocation.maxInputTokens ||
        parsed.value.outputTokens > invocation.maxOutputTokens
      ) {
        const settledOver = this.#deps.ledger.settle(reservationId, "unknown");
        if (settledOver.ok) chargedCentsTotal += settledOver.value.chargedCents;
        lastFailure = err({
          kind: "provider-protocol-violation",
          message: `provider-reported usage (${parsed.value.inputTokens} in / ${parsed.value.outputTokens} out) exceeds the declared request maxima (${invocation.maxInputTokens} in / ${invocation.maxOutputTokens} out)`,
        });
        this.#finishActual(accounting, chargedCentsTotal, invocation.runId);
        return { outcome: lastFailure, accounting };
      }

      // Provider-reported usage settles this attempt at actual cost.
      accounting.returnedModel = parsed.value.returnedModel;
      accounting.inputTokens = parsed.value.inputTokens;
      accounting.outputTokens = parsed.value.outputTokens;
      accounting.cachedTokens = 0;
      accounting.cacheCreationTokens = 0;
      const actualCents = costCents(model, parsed.value.inputTokens, parsed.value.outputTokens);
      const settled = this.#deps.ledger.settle(reservationId, actualCents);
      if (settled.ok) chargedCentsTotal += settled.value.chargedCents;

      const validated = this.#deps.validateOutput(invocation.outputContract, parsed.value.artifact);
      if (!validated.ok) {
        lastFailure = err(validated.error);
        // Contract-invalid structured output is the ONE validation failure
        // class with a bounded retry (fresh attempt, fresh reservation).
        if (attempt < policy.maxAttemptsPerRequest) {
          continue;
        }
        this.#finishActual(accounting, chargedCentsTotal, invocation.runId);
        return { outcome: lastFailure, accounting };
      }

      this.#finishActual(accounting, chargedCentsTotal, invocation.runId);
      return { outcome: ok(validated.value), accounting };
    }

    // Unreachable with maxAttemptsPerRequest >= 1; fail closed regardless.
    this.#finishActual(accounting, chargedCentsTotal, invocation.runId);
    return {
      outcome: lastFailure ?? err({ kind: "adapter-failure", message: "no attempt executed" }),
      accounting,
    };
  }

  #fail(accounting: ProviderAccounting | null, failure: Parameters<typeof err>[0]): AdapterResult {
    return { outcome: err(failure), accounting };
  }

  #applyRemaining(accounting: ProviderAccounting, runId: string): void {
    const remaining = this.#deps.ledger.remaining(runId, this.#deps.clock());
    accounting.budgetRemainingUsd = {
      run: round2(remaining.runCents / 100),
      day: round2(remaining.dayCents / 100),
      month: round2(remaining.monthCents / 100),
    };
  }

  #finishActual(accounting: ProviderAccounting, chargedCents: number, runId: string): void {
    accounting.actualUsd = round2(chargedCents / 100);
    this.#applyRemaining(accounting, runId);
  }
}

const round2 = (v: number): number => Math.round(v * 100) / 100;

function classifyHttpFailure(response: TransportResponse): {
  retryable: boolean;
  failure: Parameters<typeof err>[0];
} {
  const requestId = response.requestId ?? "unreported";
  if (response.status === 429) {
    return {
      retryable: true,
      failure: {
        kind: "provider-rate-limited",
        message: `provider rate limit (HTTP 429, request-id ${requestId})`,
      },
    };
  }
  if (response.status === 500 || response.status === 529) {
    return {
      retryable: true,
      failure: {
        kind: "provider-unavailable",
        message: `provider unavailable (HTTP ${response.status}, request-id ${requestId})`,
      },
    };
  }
  if (response.status === 401 || response.status === 403) {
    // Never echo the error body: provider auth errors can be
    // credential-shaped. Status and request id only.
    return {
      retryable: false,
      failure: {
        kind: "provider-auth-failed",
        message: `provider authentication/authorization failed (HTTP ${response.status}, request-id ${requestId})`,
      },
    };
  }
  return {
    retryable: false,
    failure: {
      kind: "provider-request-rejected",
      message: `provider rejected the request (HTTP ${response.status}, request-id ${requestId})`,
    },
  };
}

function parseSuccessResponse(
  response: TransportResponse,
  requestedModel: string
): Result<ParsedSuccess> {
  if (!response.contentType.startsWith("application/json")) {
    return err({
      kind: "provider-protocol-violation",
      message: `response content-type '${response.contentType}' is not application/json`,
    });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(response.bodyText);
  } catch {
    return err({
      kind: "provider-protocol-violation",
      message: "response body is not valid JSON",
    });
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return err({
      kind: "provider-protocol-violation",
      message: "response body is not a JSON object",
    });
  }
  const message = parsed as Record<string, unknown>;
  const returnedModel = message["model"];
  if (returnedModel !== requestedModel) {
    return err({
      kind: "provider-protocol-violation",
      message: `response model '${String(returnedModel)}' does not equal the requested allowed model '${requestedModel}' (threat T09); the response is rejected`,
    });
  }
  if (message["stop_reason"] !== "end_turn") {
    return err({
      kind: "provider-protocol-violation",
      message: `response stop_reason '${String(message["stop_reason"])}' is not end_turn; truncated or refused output is rejected, never partially persisted`,
    });
  }
  const usage = message["usage"];
  if (typeof usage !== "object" || usage === null) {
    return err({ kind: "provider-protocol-violation", message: "response carries no usage object" });
  }
  const usageRecord = usage as Record<string, unknown>;
  const inputTokens = usageRecord["input_tokens"];
  const outputTokens = usageRecord["output_tokens"];
  if (
    !Number.isInteger(inputTokens) ||
    (inputTokens as number) < 0 ||
    !Number.isInteger(outputTokens) ||
    (outputTokens as number) < 0
  ) {
    return err({
      kind: "provider-protocol-violation",
      message: "response usage token counts are not non-negative integers",
    });
  }
  for (const cacheField of ["cache_creation_input_tokens", "cache_read_input_tokens"]) {
    const v = usageRecord[cacheField];
    if (v !== undefined && v !== null && v !== 0) {
      return err({
        kind: "provider-protocol-violation",
        message: `response reports nonzero ${cacheField} while caching is disabled by the signed candidate`,
      });
    }
  }
  const content = message["content"];
  if (!Array.isArray(content) || content.length !== 1) {
    return err({
      kind: "provider-protocol-violation",
      message: `response carries ${Array.isArray(content) ? content.length : "no"} content blocks; exactly one structured-output block is expected`,
    });
  }
  const block = content[0] as Record<string, unknown>;
  if (block["type"] !== "text" || typeof block["text"] !== "string") {
    return err({
      kind: "provider-protocol-violation",
      message: `unexpected content block type '${String(block["type"])}'; only the structured-output text block is accepted`,
    });
  }
  let artifact: unknown;
  try {
    artifact = JSON.parse(block["text"]);
  } catch {
    return err({
      kind: "output-validation-failed",
      artifactType: "structured-output",
      issues: [],
      message: "structured-output block is not valid JSON",
    });
  }
  return ok({
    artifact,
    returnedModel: requestedModel,
    inputTokens: inputTokens as number,
    outputTokens: outputTokens as number,
    requestId: response.requestId,
  });
}
