// Tier-0 build-brand-context: deterministic compilation of already structured,
// already validated truth into a schema-valid Brand Context Package
// (skills/build-brand-context.skill.yaml). This is compilation, not extraction:
// no model call exists or is hidden here, missing information becomes a gap
// rather than invented content, and inference never silently becomes fact
// (INV-FACT-001/002, INV-DET-001).
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

export interface ContradictionInput {
  claim_refs: string[];
  description: string;
  blocking_publication?: boolean;
}

export interface GapInput {
  what: string;
  why_needed: string;
  blocking?: boolean;
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
  contradictions: ContradictionInput[];
  gaps: GapInput[];
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

  // 5. Every reference in identity, audience, and contradictions must resolve.
  const requireClaim = (ref: string, where: string): Result<null> => {
    if (!claimIds.has(ref)) {
      return err({
        kind: "reference-violation",
        message: `${where} references claim '${ref}', which was not supplied`,
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
  for (const [i, contradiction] of input.contradictions.entries()) {
    for (const ref of contradiction.claim_refs) {
      const r = requireClaim(ref, `open contradiction ${i}`);
      if (!r.ok) return r;
    }
  }
  if (input.market?.default_locale_claim_ref) {
    const r = requireClaim(input.market.default_locale_claim_ref, "market default locale");
    if (!r.ok) return r;
  }

  // 6. Provisional whenever the package rests on open assumptions or anything
  //    not human/fragment-verified (PROVENANCE §10) — derived, never asserted.
  const provisional =
    assumptions.some((a) => a["status"] === "open") ||
    claims.some((c) => c["verification_status"] !== "verified");

  const artifact: Record<string, unknown> = {
    schema_version: "1.3.0",
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
    claim_refs: claims.map((c) => String(c["artifact_id"])),
    assumption_refs: assumptions.map((a) => String(a["artifact_id"])),
    // Open contradictions stay visible in the compiled package — they are never
    // resolved or dropped by the compiler (human gate, INV-HUM-001(3)).
    open_contradictions: input.contradictions.map((c) => ({
      claim_refs: [...c.claim_refs],
      description: c.description,
      ...(c.blocking_publication !== undefined ? { blocking_publication: c.blocking_publication } : {}),
    })),
    // Missing information is a gap, not invented content.
    gaps: input.gaps.map((g) => ({
      what: g.what,
      why_needed: g.why_needed,
      ...(g.blocking !== undefined ? { blocking: g.blocking } : {}),
    })),
    ...(input.audience ? { audience: input.audience } : {}),
    ...(input.market ? { market: input.market } : {}),
  };

  // 7. The output itself is validated before it can be stored or returned.
  return registry.validate("brand-context", artifact);
}
