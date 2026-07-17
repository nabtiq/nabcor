// Tier-0 build-brand-context: deterministic compilation of already structured,
// already validated truth into a schema-valid Brand Context Package
// (skills/build-brand-context.skill.yaml). This is compilation, not extraction:
// no model call exists or is hidden here, missing information becomes a gap
// rather than invented content, and inference never silently becomes fact
// (INV-FACT-001/002, INV-DET-001).
import type { ContractRegistry } from "../kernel/contract-registry.js";
import { type Result, err, ok } from "../kernel/result.js";

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

function locatorFilePart(sourceRef: string): string {
  return sourceRef.split("#")[0] ?? sourceRef;
}

export function buildBrandContext(
  input: BrandContextInput,
  registry: ContractRegistry
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
  const sourceLocators = new Set(sources.map((s) => String(s["filename_or_locator"])));
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

  // 4. Factual claims retain provenance: never inference-sourced, and their
  //    source_ref must resolve to a supplied source's locator (INV-FACT-001).
  for (const c of claims) {
    if (c["classification"] !== "factual") continue;
    const sourceType = String(c["source_type"]);
    if (sourceType === "model_inference" || sourceType === "model_generation") {
      return err({
        kind: "reference-violation",
        message: `factual claim '${String(c["artifact_id"])}' cannot have source_type '${sourceType}' (model output is never factual evidence)`,
      });
    }
    const sourceRef = c["source_ref"];
    if (typeof sourceRef !== "string" || sourceRef.length === 0) {
      return err({
        kind: "reference-violation",
        message: `factual claim '${String(c["artifact_id"])}' has no source_ref (INV-FACT-001)`,
      });
    }
    if (!sourceLocators.has(locatorFilePart(sourceRef))) {
      return err({
        kind: "reference-violation",
        message: `factual claim '${String(c["artifact_id"])}' cites '${sourceRef}', which matches no supplied source locator`,
      });
    }
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
    schema_version: "1.1.0",
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
