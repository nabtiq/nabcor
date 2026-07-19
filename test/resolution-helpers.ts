// Shared setup for the authenticated fact-resolution tests (DEC-0016).
// Every keypair is ephemeral and in-memory; every store is a temp directory;
// nothing here touches the committed active policy/registry or any real key.
import { writeFileSync } from "node:fs";
import { FileArtifactStore } from "../src/kernel/artifact-store.js";
import { contentDigest } from "../src/kernel/canonical-json.js";
import { FileApprovalReceiptStore } from "../src/authority/receipt-store.js";
import {
  APPROVAL_DOMAIN,
  APPROVAL_PAYLOAD_TYPE,
  APPROVAL_PAYLOAD_VERSION,
  approvalPayloadDigest,
  signApprovalPayload,
} from "../src/authority/approval-payload.js";
import type { TrustedAuthorityConfig } from "../src/authority/authority.js";
import { analyzeStructuredTruth } from "../src/understand/analyze-structured-truth.js";
import {
  type DecisionPreparationInput,
  type PreparedDecision,
  prepareFactResolutionDecision,
} from "../src/resolve/prepare-decision.js";
import type { FactResolutionDeps } from "../src/resolve/apply-resolution.js";
import { contradictionFingerprint } from "../src/resolve/resolution-ids.js";
import { type Result } from "../src/kernel/result.js";
import {
  type EphemeralAuthority,
  POLICY_ID,
  SUBJECT,
  authorityEntry,
  ephemeralAuthority,
  policyDoc,
  registryDoc,
  testNonce,
  trustedConfig,
} from "./authority-helpers.js";
import { BRAND, NOW, WS, registry, tempDir, validClaim, validSlot, validTruthProfile } from "./helpers.js";

export const FACT_KEY = "identity.primary_name";
export const ANALYSIS_ID = "ta_r_0001";
export const SNAPSHOT_ID = "snap_r_0001";
export const DECISION_ID = "frd_r_0001";
export const PROFILE_ID = "tp_t_0001";

/** A factual claim carrying explicit fact metadata for the standard slot. */
export function factClaim(
  artifactId: string,
  value: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return validClaim({
    artifact_id: artifactId,
    fact_key: FACT_KEY,
    normalized_value: value,
    normalization_basis: "verbatim name as written; no case folding, no Unicode normalization",
    ...overrides,
  });
}

export interface ResolutionScenario {
  deps: FactResolutionDeps;
  store: FileArtifactStore;
  artifactsRoot: string;
  receiptRoot: string;
  auth: EphemeralAuthority;
  config: TrustedAuthorityConfig;
  profile: Record<string, unknown>;
  analysis: Record<string, unknown>;
  snapshot: Record<string, unknown>;
  fingerprint: string;
}

/**
 * Build a namespace holding a genuine analyzer-produced open contradiction:
 * the supplied claims (default: two conflicting values for the standard
 * slot), the persisted profile, and the persisted snapshot + analysis.
 */
export function resolutionScenario(
  options: {
    claims?: Record<string, unknown>[];
    profile?: Record<string, unknown>;
    configOverrides?: {
      policy?: Record<string, unknown>;
      registryDocument?: Record<string, unknown>;
      entry?: Record<string, unknown>;
    };
  } = {}
): ResolutionScenario {
  const claims =
    options.claims ??
    [factClaim("claim_r_win", "Alpha Brand"), factClaim("claim_r_lose", "Beta Brand")];
  const profile = options.profile ?? validTruthProfile({ artifact_id: PROFILE_ID });

  const artifactsRoot = tempDir("resolution-artifacts");
  const store = new FileArtifactStore(artifactsRoot, registry());
  for (const c of claims) {
    const put = store.put(WS, BRAND, "claim", c);
    if (!put.ok) throw new Error(`scenario: claim put failed: ${JSON.stringify(put)}`);
  }
  const profilePut = store.put(WS, BRAND, "truth-profile", profile);
  if (!profilePut.ok) throw new Error(`scenario: profile put failed: ${JSON.stringify(profilePut)}`);

  const analyzed = analyzeStructuredTruth(
    {
      artifactId: ANALYSIS_ID,
      snapshotArtifactId: SNAPSHOT_ID,
      workspace: WS,
      brandRef: BRAND,
      createdAt: NOW,
      truthProfile: profile,
    },
    store,
    registry()
  );
  if (!analyzed.ok) throw new Error(`scenario: analysis failed: ${JSON.stringify(analyzed)}`);
  const snapPut = store.put(WS, BRAND, "claim-snapshot", analyzed.value.snapshot);
  if (!snapPut.ok) throw new Error(`scenario: snapshot put failed: ${JSON.stringify(snapPut)}`);
  const anaPut = store.put(WS, BRAND, "truth-analysis", analyzed.value.analysis);
  if (!anaPut.ok) throw new Error(`scenario: analysis put failed: ${JSON.stringify(anaPut)}`);

  const auth = ephemeralAuthority();
  const entry = authorityEntry(auth, options.configOverrides?.entry ?? {});
  const policy = policyDoc(options.configOverrides?.policy ?? {});
  const registryDocument = registryDoc([entry], options.configOverrides?.registryDocument ?? {});
  const loaded = trustedConfig(policy, registryDocument);
  if (!loaded.ok) throw new Error(`scenario: trusted config failed: ${JSON.stringify(loaded)}`);

  const receiptRoot = tempDir("resolution-receipts");
  const deps: FactResolutionDeps = {
    contracts: registry(),
    artifactStore: store,
    receiptStore: new FileApprovalReceiptStore(receiptRoot, registry()),
    config: loaded.value,
    clock: () => NOW,
  };
  const hasContradiction = ((analyzed.value.analysis["open_contradictions"] ?? []) as unknown[]).length > 0;
  return {
    deps,
    store,
    artifactsRoot,
    receiptRoot,
    auth,
    config: loaded.value,
    profile,
    analysis: analyzed.value.analysis,
    snapshot: analyzed.value.snapshot,
    fingerprint: hasContradiction ? fingerprintOf(analyzed.value.analysis, FACT_KEY) : "",
  };
}

/** The deterministic fingerprint of one open contradiction in an analysis. */
export function fingerprintOf(analysis: Record<string, unknown>, factKey: string): string {
  const contradiction = (
    (analysis["open_contradictions"] ?? []) as {
      fact_key: string;
      claim_refs: string[];
      distinct_values: (string | number | boolean)[];
    }[]
  ).find((c) => c.fact_key === factKey);
  if (!contradiction) throw new Error(`no open contradiction for '${factKey}' in the analysis`);
  return contradictionFingerprint(
    WS,
    BRAND,
    factKey,
    contradiction.claim_refs,
    contradiction.distinct_values
  );
}

/** Prepare the standard decision for a scenario (winner defaults to claim_r_win). */
export function prepareDecision(
  scenario: ResolutionScenario,
  overrides: Partial<DecisionPreparationInput> = {}
): Result<PreparedDecision> {
  return prepareFactResolutionDecision(
    {
      decisionArtifactId: DECISION_ID,
      workspace: WS,
      brandRef: BRAND,
      truthAnalysisRef: ANALYSIS_ID,
      factKey: FACT_KEY,
      contradictionFingerprint: scenario.fingerprint,
      winningClaimRef: "claim_r_win",
      rationale: "synthetic test resolution: the winning value matches the primary evidence",
      requesterId: SUBJECT,
      createdAt: NOW,
      ...overrides,
    },
    scenario.store,
    registry()
  );
}

/** Signed approval evidence over one prepared decision. */
export function decisionEvidence(
  scenario: ResolutionScenario,
  prepared: PreparedDecision,
  payloadOverrides: Record<string, unknown> = {},
  signer?: EphemeralAuthority,
  evidenceOverrides: Record<string, unknown> = {}
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    payload_type: APPROVAL_PAYLOAD_TYPE,
    payload_version: APPROVAL_PAYLOAD_VERSION,
    domain: APPROVAL_DOMAIN,
    approval_id: "appr_r_0001",
    workspace: WS,
    brand_ref: BRAND,
    target_artifact_type: "fact-resolution-decision",
    target_artifact_ref: String(prepared.decision["artifact_id"]),
    target_artifact_digest: prepared.decisionDigest,
    gate: "fact-resolution-approval",
    verdict: "approved",
    reason: "synthetic test approval of a fact-resolution decision",
    requester_id: SUBJECT,
    approver_id: SUBJECT,
    role: "product-owner",
    self_review: true,
    key_id: scenario.auth.keyId,
    policy_ref: POLICY_ID,
    policy_version: 1,
    nonce: testNonce(),
    issued_at: "2026-07-17T11:30:00Z",
    expires_at: "2026-07-17T12:30:00Z",
    ...payloadOverrides,
  };
  const signatureB64 = signApprovalPayload(payload, (signer ?? scenario.auth).privateKeyPem);
  return {
    schema_version: "1.9.0",
    evidence_id: "apev_r_0001",
    payload,
    payload_digest: approvalPayloadDigest(payload),
    signature: { algorithm: "ed25519", signature_b64: signatureB64 },
    ...evidenceOverrides,
  };
}

/** Persist a handcrafted analysis + matching snapshot binding (for tamper tests). */
export function persistFabricatedAnalysis(
  store: FileArtifactStore,
  analysis: Record<string, unknown>
): void {
  const put = store.put(WS, BRAND, "truth-analysis", analysis);
  if (!put.ok) throw new Error(`fabricated analysis put failed: ${JSON.stringify(put)}`);
}

/** Overwrite a stored artifact's raw file bytes (byte-tamper simulation). */
export function tamperStoredArtifact(
  artifactsRoot: string,
  type: string,
  artifactId: string,
  artifact: Record<string, unknown>
): void {
  writeFileSync(
    `${artifactsRoot}/${WS}/${BRAND}/${type}/${artifactId}.json`,
    JSON.stringify(artifact, null, 2) + "\n",
    "utf8"
  );
}

export { contentDigest };
