// Shared setup for the one-shot smoke-call tests (DEC-0020). Everything is
// synthetic: mock transport, generated fake keys, ephemeral Product Owner
// keys, deterministic clock. No real network or credential exists here.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AnthropicAdapter } from "../src/gateway/adapters/anthropic.js";
import { FileBudgetLedger } from "../src/gateway/adapters/budget-ledger.js";
import { ApprovalLiveCallAuthorization } from "../src/gateway/adapters/live-authorization.js";
import { loadProviderPolicy, type ProviderPolicy } from "../src/gateway/adapters/provider-policy.js";
import { buildLiveCallRequest, providerOutputSchema, requestDigestOf } from "../src/smoke/live-call-request.js";
import { SmokeCallService, type SmokeCallDeps } from "../src/smoke/smoke-call.js";
import { contentDigest } from "../src/kernel/canonical-json.js";
import { FileArtifactStore } from "../src/kernel/artifact-store.js";
import { FileApprovalReceiptStore } from "../src/authority/receipt-store.js";
import { loadTrustedAuthorityConfig } from "../src/authority/authority.js";
import {
  APPROVAL_DOMAIN,
  APPROVAL_PAYLOAD_TYPE,
  APPROVAL_PAYLOAD_VERSION,
  approvalPayloadDigest,
  signApprovalPayload,
} from "../src/authority/approval-payload.js";
import { ephemeralAuthority, type EphemeralAuthority } from "./authority-helpers.js";
import {
  MockTransport,
  fakeApiKey,
  okSecret,
  successResponse,
  type AdapterEnv,
} from "./anthropic-helpers.js";
import { BRAND, WS, contractsDir, registry, tempDir } from "./helpers.js";
import type { ProviderSecretResolver } from "../src/gateway/adapters/secret.js";
import type { AnthropicTransport, TransportResult } from "../src/gateway/adapters/transport.js";

export const SMOKE_CLOCK = "2026-07-20T01:00:00Z";
export const SUBJECT = "ibrahim-mohamed";

/** The committed provider policy, clock inside the candidate window. */
export function smokePolicy(): ProviderPolicy {
  const loaded = loadProviderPolicy(contractsDir, registry(), () => SMOKE_CLOCK);
  if (!loaded.ok) throw new Error(`smoke policy must load: ${JSON.stringify(loaded)}`);
  return loaded.value;
}

/** The trivial provider-smoke-echo output schema, and a validator over it. */
export function smokeOutput(): {
  schema: Record<string, unknown>;
  validate: (a: unknown) => ReturnType<ReturnType<typeof registry>["validate"]>;
} {
  const contract = JSON.parse(
    readFileSync(join(contractsDir, "provider-smoke-echo.schema.json"), "utf8")
  ) as Record<string, unknown>;
  return {
    schema: providerOutputSchema(contract),
    validate: (a: unknown) => registry().validate("provider-smoke-echo", a),
  };
}

/** A trusted-config bundle with one ephemeral Product Owner key enrolled with the provider gates. */
export function smokeTrustedConfig(auth: EphemeralAuthority): {
  config: ReturnType<typeof loadTrustedAuthorityConfig>;
  dir: string;
} {
  const dir = tempDir("smoke-config");
  const registryDoc = {
    schema_version: "1.10.0",
    registry_id: "areg-nabcor",
    registry_version: 2,
    supersedes_registry_version: 1,
    created_at: "2026-07-19T00:08:51Z",
    decision_ref: "DEC-0015",
    authorities: [
      {
        key_id: auth.keyId,
        subject_id: SUBJECT,
        label: "Ephemeral Product Owner (smoke test)",
        algorithm: "ed25519",
        public_key_spki_b64: auth.spkiB64,
        roles: ["product-owner"],
        valid_from: "2026-07-01T00:00:00Z",
        valid_until: "2027-07-19T00:00:00Z",
        status: "active",
      },
    ],
  };
  const policy = JSON.parse(
    readFileSync(join(contractsDir, "human-gate-policy.active.json"), "utf8")
  ) as Record<string, unknown>;
  writeFileSync(join(dir, "authority-registry.active.json"), JSON.stringify(registryDoc, null, 2) + "\n", "utf8");
  writeFileSync(join(dir, "human-gate-policy.active.json"), JSON.stringify(policy, null, 2) + "\n", "utf8");
  const config = loadTrustedAuthorityConfig(
    join(dir, "human-gate-policy.active.json"),
    join(dir, "authority-registry.active.json"),
    registry()
  );
  return { config, dir };
}

export interface SmokeEnv {
  service: SmokeCallService;
  deps: SmokeCallDeps;
  request: Record<string, unknown>;
  requestDigest: string;
  transport: MockTransport;
  ledger: FileBudgetLedger;
  apiKey: string;
  receiptRoot: string;
}

/**
 * A complete smoke environment: a stored, signed live-call-request; an
 * approval-backed authorization bound to its exact digest; a mock transport;
 * a ledger with the ceremony/global ceilings; and a fake credential.
 */
export function smokeEnv(
  overrides: Partial<{
    responses: TransportResult[];
    secretResolver: ProviderSecretResolver;
    requestOverrides: Record<string, unknown>;
    payloadOverrides: Record<string, unknown>;
    signer: EphemeralAuthority;
    expectedTargetDigest: string;
    validFrom: string;
    validUntil: string;
    clock: () => string;
  }> = {}
): SmokeEnv {
  const policy = smokePolicy();
  const auth = ephemeralAuthority();
  const { config } = smokeTrustedConfig(overrides.signer ? overrides.signer : auth);

  const promptFixture = readFileSync(join(contractsDir, "..", "fixtures", "synthetic", "smoke-prompt.json"), "utf8");
  const fixtureDigest = contentDigest(JSON.parse(promptFixture));

  const baseRequest = buildLiveCallRequest({
    artifactId: "lpcr-anthropic-smoke-0001",
    workspace: WS,
    brandRef: BRAND,
    createdAt: SMOKE_CLOCK,
    policy,
    fixtures: [{ fixtureId: "smoke-prompt-0001", contentDigest: fixtureDigest }],
    expectedOutputContract: "provider-smoke-echo",
    maxInputTokens: 200,
    maxOutputTokens: 64,
    validFrom: overrides.validFrom ?? "2026-07-20T00:00:00Z",
    validUntil: overrides.validUntil ?? "2026-07-20T02:00:00Z",
    purpose: "Synthetic Haiku smoke request (DEC-0020).",
  });
  const request = { ...baseRequest, ...(overrides.requestOverrides ?? {}) };
  // Recompute request_digest if fields were overridden so the artifact stays
  // self-consistent unless the test deliberately tampers the digest.
  if (overrides.requestOverrides && !("request_digest" in overrides.requestOverrides)) {
    request["request_digest"] = requestDigestOf(request);
  }

  const storeRoot = tempDir("smoke-artifacts");
  const store = new FileArtifactStore(storeRoot, registry());
  const put = store.put(WS, BRAND, "live-provider-call-request", request);
  if (!put.ok) throw new Error(`smoke request must store: ${JSON.stringify(put)}`);
  const stored = store.get(WS, BRAND, "live-provider-call-request", String(request["artifact_id"]));
  if (!stored.ok) throw new Error("smoke request read-back failed");
  const requestDigest = contentDigest(stored.value);

  const receiptRoot = tempDir("smoke-receipts");
  const nonce = "5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a";
  const payload: Record<string, unknown> = {
    payload_type: APPROVAL_PAYLOAD_TYPE,
    payload_version: APPROVAL_PAYLOAD_VERSION,
    domain: APPROVAL_DOMAIN,
    approval_id: "appr_smoke_0001",
    workspace: WS,
    brand_ref: BRAND,
    target_artifact_type: "live-provider-call-request",
    target_artifact_ref: String(request["artifact_id"]),
    target_artifact_digest: requestDigest,
    gate: "live-provider-call-approval",
    verdict: "approved",
    reason: "One synthetic Haiku smoke request, no retry, USD 0.25 max, no EXP-0001 (DEC-0020).",
    requester_id: SUBJECT,
    approver_id: SUBJECT,
    role: "product-owner",
    self_review: true,
    key_id: auth.keyId,
    policy_ref: "hgp-nabcor-1",
    policy_version: 3,
    nonce,
    issued_at: "2026-07-20T00:30:00Z",
    expires_at: "2026-07-20T01:30:00Z",
    ...(overrides.payloadOverrides ?? {}),
  };
  const evidence: Record<string, unknown> = {
    schema_version: "1.10.0",
    evidence_id: "apev_smoke_0001",
    payload,
    payload_digest: approvalPayloadDigest(payload),
    signature: { algorithm: "ed25519", signature_b64: signApprovalPayload(payload, auth.privateKeyPem) },
  };

  if (!config.ok) throw new Error(`smoke trusted config must load: ${JSON.stringify(config)}`);
  const liveAuthorization = new ApprovalLiveCallAuthorization(
    evidence,
    {
      contracts: registry(),
      artifactStore: store,
      receiptStore: new FileApprovalReceiptStore(receiptRoot, registry()),
      config: config.value,
      clock: overrides.clock ?? (() => SMOKE_CLOCK),
    },
    overrides.expectedTargetDigest ?? requestDigest
  );

  const ledger = new FileBudgetLedger(tempDir("smoke-ledger"), {
    perRequestCents: 25,
    perRunCents: 2500,
    perDayCents: 4000,
    perMonthCents: 6000,
  });
  const apiKey = fakeApiKey();
  const transport = new MockTransport(overrides.responses ?? [smokeSuccess()]);
  const { schema, validate } = smokeOutput();

  const deps: SmokeCallDeps = {
    request,
    policy,
    liveAuthorization,
    ledger,
    secretResolver: overrides.secretResolver ?? okSecret(apiKey),
    transport,
    clock: overrides.clock ?? (() => SMOKE_CLOCK),
    scenarioPrompt: JSON.parse(promptFixture).prompt,
    outputSchema: schema,
    validateOutput: (a) => validate(a),
  };
  return { service: new SmokeCallService(), deps, request, requestDigest, transport, ledger, apiKey, receiptRoot };
}

/** A provider success response returning the trivial echo artifact. */
export function smokeSuccess(
  overrides: Partial<{ inputTokens: number; outputTokens: number; model: string; requestId: string }> = {}
): TransportResult {
  return successResponse({
    model: overrides.model ?? "claude-haiku-4-5-20251001",
    inputTokens: overrides.inputTokens ?? 40,
    outputTokens: overrides.outputTokens ?? 5,
    artifact: { acknowledgement: "nabcor-smoke-ok" },
    requestId: overrides.requestId ?? "req_smoke_synthetic_0001",
  });
}

// Re-export a couple of anthropic-helpers pieces the smoke tests reuse.
export { MockTransport, successResponse, httpError, timeoutResult, missingSecret } from "./anthropic-helpers.js";
export type { AdapterEnv };
export { AnthropicAdapter };
