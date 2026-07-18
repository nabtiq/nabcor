// Tier-0 build-brand-context: deterministic compilation of already structured,
// already validated truth into a schema-valid Brand Context Package
// (skills/build-brand-context.skill.yaml). This is compilation, not extraction:
// no model call exists or is hidden here, missing information becomes a gap
// rather than invented content, and inference never silently becomes fact
// (INV-FACT-001/002, INV-DET-001).
//
// Open contradictions and gaps enter through exactly one authoritative input —
// a validated truth-analysis artifact produced by the deterministic Tier-0
// analyzer (DEC-0011, src/understand/analyze-structured-truth.ts). The
// compiler verifies brand and exact claim coverage, records the
// truth_analysis_ref on the package, and rejects caller-supplied
// contradiction/gap arrays, so analysis results can be neither injected,
// omitted, nor independently rewritten.
//
// The package compiles EFFECTIVE current claims only (DEC-0012): its
// claim_refs are the analysis's effective_claim_refs (validated lineage heads
// active as current truth), and every identity, audience, and market
// reference must resolve to an effective claim — a reference to a superseded,
// contradicted, rejected, or expired claim fails closed. The complete claim
// revision set (including historical revisions) is still supplied, coverage-
// checked against the analysis, and provenance-verified; no stored claim is
// deleted or mutated to achieve this.
//
// Claim provenance is canonical (DEC-0006, DEC-0007): a source_ref names a
// supplied source ARTIFACT (`source:<artifact_id>[#codepoints=a-b|#page=n]`),
// never a filename, so two sources sharing a filename can never satisfy each
// other's references. Code-point fragments on captured text are verified against
// the immutable content store using Unicode code-point coordinates (never
// String.length UTF-16 units — see src/kernel/source-ref.ts).
//
// Quarantine is FAIL-CLOSED (DEC-0007, INV-SEC-002, INV-HUM-001): every claim
// citing a quarantined source is rejected with a typed failure. The runtime
// cannot authenticate a human, and quarantine release requires an independent
// reviewer and an authenticated gate mechanism that do not yet exist
// (DEC-0008), so a `quarantine-release` approval on the artifact is audit
// metadata only and grants no authority.
import type { ContractRegistry } from "../kernel/contract-registry.js";
import type { FileContentStore } from "../kernel/content-store.js";
import { type Result, err, ok } from "../kernel/result.js";
import { codePointLength, parseSourceRef } from "../kernel/source-ref.js";
import { projectActiveClaims } from "../understand/project-active-claims.js";

export interface IdentityInput {
  names: { value: string; lang?: string; claim_ref: string }[];
  contacts?: {
    kind: "email" | "phone" | "whatsapp" | "address" | "domain" | "social";
    value: string;
    claim_ref: string;
  }[];
  existing_palette?: { hex?: string; claim_ref?: string }[];
  /** Source artifact IDs for logos/marks. */
  marks?: string[];
}

export interface BrandContextInput {
  artifactId: string;
  workspace: string;
  brandRef: string;
  mode: "prompt-only" | "evidence-rich" | "mixed";
  createdAt: string;
  sources: unknown[];
  claims: unknown[];
  assumptions: unknown[];
  /**
   * Contract-valid truth-analysis artifact (DEC-0011) — the single
   * authoritative input for open contradictions and gaps. It must belong to
   * the same brand and its analyzed claim set must exactly match `claims`;
   * caller-supplied contradiction/gap arrays are rejected.
   */
  truthAnalysis: unknown;
  identity: IdentityInput;
  audience?: { claim_ref: string }[];
  market?: { locales?: string[]; default_locale_claim_ref?: string };
}

const PROMPT_ONLY_SOURCE_KINDS = new Set(["prompt", "brief"]);

export function buildBrandContext(
  input: BrandContextInput,
  registry: ContractRegistry,
  contentStore: FileContentStore
): Result<Record<string, unknown>> {
  // 0. Contradiction and gap results have exactly one authoritative input: the
  //    truth-analysis artifact (DEC-0011). A caller attempting to supply its
  //    own arrays — the pre-1.4.0 interface — is rejected, not silently
  //    ignored, so analysis results cannot be injected, omitted, or rewritten.
  for (const bypassField of ["contradictions", "gaps"]) {
    if (bypassField in (input as unknown as Record<string, unknown>)) {
      return err({
        kind: "invalid-input",
        message: `caller-supplied '${bypassField}' are rejected: open contradictions and gaps compile only from the validated truth-analysis artifact (DEC-0011)`,
      });
    }
  }

  // 1. Every supplied artifact must itself be contract-valid (schema + semantic —
  //    an inference presented as a verified fact dies here, INV-FACT-002).
  const sources: Record<string, unknown>[] = [];
  for (const s of input.sources) {
    const v = registry.validate("source", s);
    if (!v.ok) return v;
    sources.push(v.value);
  }
  const claims: Record<string, unknown>[] = [];
  for (const c of input.claims) {
    const v = registry.validate("claim", c);
    if (!v.ok) return v;
    claims.push(v.value);
  }
  const assumptions: Record<string, unknown>[] = [];
  for (const a of input.assumptions) {
    const v = registry.validate("assumption", a);
    if (!v.ok) return v;
    assumptions.push(v.value);
  }
  const analysisResult = registry.validate("truth-analysis", input.truthAnalysis);
  if (!analysisResult.ok) return analysisResult;
  const analysis = analysisResult.value;

  // 1b. The analysis must belong to this brand, reference a truth profile, and
  //     cover EXACTLY the supplied claim set — a package can neither drop
  //     analyzed claims nor smuggle in unanalyzed ones (fail closed, DEC-0011).
  if (analysis["brand_ref"] !== input.brandRef) {
    return err({
      kind: "reference-violation",
      message: `truth analysis '${String(analysis["artifact_id"])}' carries brand_ref '${String(analysis["brand_ref"])}', expected '${input.brandRef}'`,
    });
  }
  const analyzedRefs = new Set((analysis["analyzed_claim_refs"] as string[]) ?? []);
  const suppliedIds = new Set(claims.map((c) => String(c["artifact_id"])));
  for (const ref of analyzedRefs) {
    if (!suppliedIds.has(ref)) {
      return err({
        kind: "reference-violation",
        message: `truth analysis '${String(analysis["artifact_id"])}' analyzed claim '${ref}', which was not supplied to the compiler; the analyzed and supplied claim sets must match exactly`,
      });
    }
  }
  for (const id of suppliedIds) {
    if (!analyzedRefs.has(id)) {
      return err({
        kind: "reference-violation",
        message: `claim '${id}' was supplied to the compiler but is not covered by truth analysis '${String(analysis["artifact_id"])}'; re-run the analyzer over the full claim set`,
      });
    }
  }

  // 1c. Effective current truth comes from the analysis's validated lineage
  //     projection (DEC-0012): the package compiles effective claims only, and
  //     a reference to a superseded or inactive claim fails closed below. The
  //     truth-analysis semantic layer guarantees these collections partition
  //     analyzed_claim_refs exactly.
  const effectiveRefs = new Set((analysis["effective_claim_refs"] as string[]) ?? []);
  const supersededRefs = new Set((analysis["superseded_claim_refs"] as string[]) ?? []);
  const inactiveReasonByRef = new Map(
    ((analysis["inactive_head_claims"] as { claim_ref: string; reason: string }[]) ?? []).map(
      (c) => [c.claim_ref, c.reason]
    )
  );

  // 1d. The declared partition must agree with the projection re-derived from
  //     the supplied complete claim set (DEC-0012): internal self-consistency
  //     alone would let a fabricated or stale analysis promote a contradicted,
  //     rejected, expired, or superseded claim back into effective truth.
  //     projectActiveClaims stays the single lineage implementation — this is
  //     agreement checking against it, never a second copy of its rules.
  const projected = projectActiveClaims(
    { workspace: input.workspace, brandRef: input.brandRef, claims: input.claims },
    registry
  );
  if (!projected.ok) return projected;
  const projection = projected.value;
  const declaredStateOf = (id: string): string =>
    effectiveRefs.has(id)
      ? "effective"
      : supersededRefs.has(id)
        ? "superseded"
        : `inactive (${inactiveReasonByRef.get(id) ?? "unlisted"})`;
  const projectedStates = new Map<string, string>();
  for (const id of projection.effectiveClaimRefs) projectedStates.set(id, "effective");
  for (const id of projection.supersededClaimRefs) projectedStates.set(id, "superseded");
  for (const c of projection.inactiveHeadClaims) {
    projectedStates.set(c.claim_ref, `inactive (${c.reason})`);
  }
  for (const id of projection.inputClaimRefs) {
    const declared = declaredStateOf(id);
    const derived = projectedStates.get(id)!;
    if (declared !== derived) {
      return err({
        kind: "reference-violation",
        message: `truth analysis '${String(analysis["artifact_id"])}' declares claim '${id}' as ${declared}, but the lineage projection over the supplied claim revision set derives ${derived}; the analysis does not match the claims and is rejected (DEC-0012)`,
      });
    }
  }

  // 2. One brand per package (INV-DATA-001).
  for (const artifact of [...sources, ...claims, ...assumptions]) {
    if (artifact["brand_ref"] !== input.brandRef) {
      return err({
        kind: "reference-violation",
        message: `artifact '${String(artifact["artifact_id"])}' carries brand_ref '${String(artifact["brand_ref"])}', expected '${input.brandRef}'`,
      });
    }
  }

  const sourceIds = new Set(sources.map((s) => String(s["artifact_id"])));
  const sourceById = new Map(sources.map((s) => [String(s["artifact_id"]), s]));
  const claimIds = new Set(claims.map((c) => String(c["artifact_id"])));

  // 3. Prompt-only mode has no uploaded evidence: prompt/brief sources only, so
  //    no factual proof point can be manufactured from material that is not there.
  if (input.mode === "prompt-only") {
    for (const s of sources) {
      if (!PROMPT_ONLY_SOURCE_KINDS.has(String(s["kind"]))) {
        return err({
          kind: "reference-violation",
          message: `prompt-only mode cannot include source '${String(s["artifact_id"])}' of kind '${String(s["kind"])}' (prompt/brief only)`,
        });
      }
    }
  }

  // 4. Claim provenance resolves canonically (INV-FACT-001, DEC-0006): factual
  //    claims are never inference-sourced and must carry a source_ref; every
  //    non-null source_ref must be a canonical `source:<artifact_id>` reference
  //    resolving to a supplied source artifact ID. Filename-based references are
  //    rejected, never silently mapped (contracts/README.md migration rule).
  for (const c of claims) {
    const claimId = String(c["artifact_id"]);
    if (c["classification"] === "factual") {
      const sourceType = String(c["source_type"]);
      if (sourceType === "model_inference" || sourceType === "model_generation") {
        return err({
          kind: "reference-violation",
          message: `factual claim '${claimId}' cannot have source_type '${sourceType}' (model output is never factual evidence)`,
        });
      }
      if (typeof c["source_ref"] !== "string" || c["source_ref"].length === 0) {
        return err({
          kind: "reference-violation",
          message: `factual claim '${claimId}' has no source_ref (INV-FACT-001)`,
        });
      }
    }
    const sourceRef = c["source_ref"];
    if (typeof sourceRef !== "string") continue;
    const parsed = parseSourceRef(sourceRef);
    if (!parsed) {
      return err({
        kind: "reference-violation",
        message: `claim '${claimId}' source_ref '${sourceRef}' is not a canonical source reference (source:<artifact_id>[#codepoints=a-b|#page=n]); filename-based references and the retired #chars= form are rejected — re-issue the claim against the source artifact ID with code-point offsets`,
      });
    }
    const source = sourceById.get(parsed.sourceId);
    if (!source) {
      return err({
        kind: "reference-violation",
        message: `claim '${claimId}' cites source artifact '${parsed.sourceId}', which was not supplied`,
      });
    }
    const capture = (source["capture"] ?? {}) as Record<string, unknown>;

    // Quarantine boundary is fail-closed (DEC-0007, INV-SEC-002, INV-HUM-001):
    // no claim citing a quarantined source compiles, whatever approval metadata
    // the artifact carries — the runtime cannot authenticate a human release,
    // and the independent reviewer and authenticated gate mechanism DEC-0008
    // requires do not yet exist, so a syntactically valid `quarantine-release`
    // approval is audit metadata only and grants no authority. The failure
    // names only artifact IDs; captured content never appears in it.
    if (capture["safety"] === "quarantined") {
      return err({
        kind: "quarantine-fail-closed",
        sourceId: parsed.sourceId,
        message: `claim '${claimId}' cites quarantined source '${parsed.sourceId}': quarantine is fail-closed because release requires an independent reviewer and an authenticated gate mechanism, neither of which exists yet (DEC-0007, DEC-0008); a quarantine-release approval on the artifact is audit metadata and grants no release authority`,
      });
    }

    if (parsed.fragment?.kind === "codepoints") {
      // Code-point fragments are auditable only on captured text: verify exact
      // access through the recorded content reference (digest-checked read).
      // Bounds use Unicode code-point coordinates (DEC-0007), never
      // String.length UTF-16 units.
      if (capture["status"] !== "captured" || typeof capture["content_ref"] !== "string") {
        return err({
          kind: "reference-violation",
          message: `claim '${claimId}' uses a code-point fragment on source '${parsed.sourceId}', whose content is not captured (${String(capture["status"] ?? "no capture record")})`,
        });
      }
      const body = contentStore.get(input.workspace, input.brandRef, capture["content_ref"]);
      if (!body.ok) return body;
      const { start, end } = parsed.fragment;
      const length = codePointLength(body.value);
      if (start >= end || end > length) {
        return err({
          kind: "reference-violation",
          message: `claim '${claimId}' fragment codepoints=${start}-${end} is out of bounds for source '${parsed.sourceId}' (captured length ${length} code points)`,
        });
      }
    }
    // Page fragments on descriptors remain structurally valid but are
    // not-yet-content-verified: no bytes exist to check in this phase.
  }

  // 5. Every reference in identity, audience, and contradictions must resolve
  //    to an EFFECTIVE claim (DEC-0012): a supplied-but-superseded or
  //    supplied-but-inactive claim is audit history, not current truth, and a
  //    package field resting on it fails closed rather than compiling.
  const requireClaim = (ref: string, where: string): Result<null> => {
    if (!claimIds.has(ref)) {
      return err({
        kind: "reference-violation",
        message: `${where} references claim '${ref}', which was not supplied`,
      });
    }
    if (!effectiveRefs.has(ref)) {
      const state = supersededRefs.has(ref)
        ? "superseded by a later revision"
        : `an inactive lineage head (${inactiveReasonByRef.get(ref) ?? "inactive"})`;
      return err({
        kind: "reference-violation",
        message: `${where} references claim '${ref}', which is ${state} in truth analysis '${String(analysis["artifact_id"])}'; only effective current claims may back package fields (DEC-0012)`,
      });
    }
    return ok(null);
  };
  for (const name of input.identity.names) {
    const r = requireClaim(name.claim_ref, `identity name '${name.value}'`);
    if (!r.ok) return r;
  }
  for (const contact of input.identity.contacts ?? []) {
    const r = requireClaim(contact.claim_ref, `identity contact '${contact.kind}'`);
    if (!r.ok) return r;
  }
  for (const swatch of input.identity.existing_palette ?? []) {
    if (swatch.claim_ref) {
      const r = requireClaim(swatch.claim_ref, "identity palette entry");
      if (!r.ok) return r;
    }
  }
  for (const mark of input.identity.marks ?? []) {
    if (!sourceIds.has(mark)) {
      return err({
        kind: "reference-violation",
        message: `identity mark references source '${mark}', which was not supplied`,
      });
    }
  }
  for (const a of input.audience ?? []) {
    const r = requireClaim(a.claim_ref, "audience entry");
    if (!r.ok) return r;
  }
  // Contradiction and gap claim references come from the analysis; the
  // truth-analysis semantic layer already pins them inside analyzed_claim_refs,
  // and coverage equality pins those to the supplied claims — this re-check
  // keeps the compiler fail-closed on its own terms (no dangling references).
  const analysisContradictions = analysis["open_contradictions"] as {
    fact_key: string;
    claim_refs: string[];
    description: string;
    blocking_publication: boolean;
  }[];
  const analysisGaps = analysis["gaps"] as {
    fact_key: string;
    what: string;
    why_needed: string;
    blocking: boolean;
  }[];
  for (const contradiction of analysisContradictions) {
    for (const ref of contradiction.claim_refs) {
      const r = requireClaim(ref, `analysis contradiction '${contradiction.fact_key}'`);
      if (!r.ok) return r;
    }
  }
  if (input.market?.default_locale_claim_ref) {
    const r = requireClaim(input.market.default_locale_claim_ref, "market default locale");
    if (!r.ok) return r;
  }

  // 6. Provisional whenever the package rests on open assumptions or anything
  //    not human/fragment-verified (PROVENANCE §10) — derived, never asserted.
  //    Only EFFECTIVE claims count (DEC-0012): a superseded or inactive
  //    historical revision is not something the package rests on.
  const provisional =
    assumptions.some((a) => a["status"] === "open") ||
    claims.some(
      (c) =>
        effectiveRefs.has(String(c["artifact_id"])) &&
        c["verification_status"] !== "verified"
    );

  const artifact: Record<string, unknown> = {
    schema_version: "1.5.0",
    artifact_id: input.artifactId,
    brand_ref: input.brandRef,
    created_at: input.createdAt,
    creator_type: "deterministic",
    lifecycle_status: "generated",
    provisional,
    mode: input.mode,
    identity: {
      names: input.identity.names.map((n) => ({
        value: n.value,
        ...(n.lang ? { lang: n.lang } : {}),
        claim_ref: n.claim_ref,
      })),
      ...(input.identity.contacts ? { contacts: input.identity.contacts } : {}),
      ...(input.identity.existing_palette ? { existing_palette: input.identity.existing_palette } : {}),
      ...(input.identity.marks ? { marks: input.identity.marks } : {}),
    },
    // Effective current claims only (DEC-0012): superseded and inactive
    // revisions stay auditable through the referenced truth analysis, never
    // through the compiled package.
    claim_refs: [...effectiveRefs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)),
    assumption_refs: assumptions.map((a) => String(a["artifact_id"])),
    // The compiled package records which analysis produced its contradiction
    // and gap results (DEC-0011 single-authoritative-input rule).
    truth_analysis_ref: String(analysis["artifact_id"]),
    // Open contradictions stay visible in the compiled package — they are never
    // resolved or dropped by the compiler (human gate, INV-HUM-001(3)).
    open_contradictions: analysisContradictions.map((c) => ({
      claim_refs: [...c.claim_refs],
      description: c.description,
      blocking_publication: c.blocking_publication,
    })),
    // Missing information is a gap, not invented content.
    gaps: analysisGaps.map((g) => ({
      what: g.what,
      why_needed: g.why_needed,
      blocking: g.blocking,
    })),
    ...(input.audience ? { audience: input.audience } : {}),
    ...(input.market ? { market: input.market } : {}),
  };

  // 7. The output itself is validated before it can be stored or returned.
  return registry.validate("brand-context", artifact);
}
