import assert from "node:assert/strict";
import test from "node:test";
import { buildBrandContext, type BrandContextInput } from "../src/compile/build-brand-context.js";
import { classifyInput, type InputDescriptor } from "../src/understand/classify-input.js";
import { NOW, loadSyntheticCase, registry, validAssumption, validClaim, validSource } from "./helpers.js";

function caseInput(name: "prompt-only" | "evidence-rich"): BrandContextInput {
  const fixture = loadSyntheticCase(name) as unknown as {
    brand_ref: string;
    mode: "prompt-only" | "evidence-rich";
    descriptors: InputDescriptor[];
    claims: unknown[];
    assumptions: unknown[];
    contradictions: { claim_refs: string[]; description: string; blocking_publication?: boolean }[];
    gaps: { what: string; why_needed: string; blocking?: boolean }[];
    identity: BrandContextInput["identity"];
    audience?: { claim_ref: string }[];
    market?: { locales?: string[] };
  };
  const classified = classifyInput(fixture.descriptors, {
    brandRef: fixture.brand_ref,
    createdAt: NOW,
  }, registry());
  assert.ok(classified.ok, JSON.stringify(classified));
  const sources = classified.ok ? classified.value : [];
  return {
    artifactId: `bctx_${name}_t`,
    brandRef: fixture.brand_ref,
    mode: fixture.mode,
    createdAt: NOW,
    sources,
    claims: fixture.claims,
    assumptions: fixture.assumptions,
    contradictions: fixture.contradictions,
    gaps: fixture.gaps,
    identity: fixture.identity,
    ...(fixture.audience ? { audience: fixture.audience } : {}),
    ...(fixture.market ? { market: fixture.market } : {}),
  };
}

test("a valid prompt-only synthetic case produces a schema-valid Brand Context Package", () => {
  const result = buildBrandContext(caseInput("prompt-only"), registry());
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  assert.equal(result.value["mode"], "prompt-only");
  assert.equal(result.value["provisional"], true, "open assumptions/inferences must mark the package provisional");
  assert.ok(registry().validate("brand-context", result.value).ok);
});

test("a valid structured evidence-rich case produces a schema-valid package with visible contradictions", () => {
  const result = buildBrandContext(caseInput("evidence-rich"), registry());
  assert.ok(result.ok, JSON.stringify(result));
  if (!result.ok) return;
  const contradictions = result.value["open_contradictions"] as { description: string }[];
  assert.equal(contradictions.length, 1, "open contradictions must remain visible in the compiled package");
  assert.ok(registry().validate("brand-context", result.value).ok);
});

function minimalInput(overrides: Partial<BrandContextInput> = {}): BrandContextInput {
  return {
    artifactId: "bctx_t_0001",
    brandRef: "brand_test",
    mode: "evidence-rich",
    createdAt: NOW,
    sources: [validSource()],
    claims: [validClaim()],
    assumptions: [validAssumption()],
    contradictions: [],
    gaps: [],
    identity: { names: [{ value: "Test Co", lang: "en", claim_ref: "claim_t_0001" }] },
    ...overrides,
  };
}

test("an unsupported factual claim is rejected", () => {
  // (a) factual without any source_ref fails the claim contract itself
  const noRef = buildBrandContext(
    minimalInput({ claims: [validClaim({ source_ref: null })] }),
    registry()
  );
  assert.equal(noRef.ok, false);
  if (!noRef.ok) assert.equal(noRef.error.kind, "validation-failed");

  // (b) factual citing a locator no supplied source carries is a reference violation
  const danglingRef = buildBrandContext(
    minimalInput({ claims: [validClaim({ source_ref: "nonexistent.pdf#page=1" })] }),
    registry()
  );
  assert.equal(danglingRef.ok, false);
  if (!danglingRef.ok) assert.equal(danglingRef.error.kind, "reference-violation");

  // (c) factual sourced from model inference can never compile
  const modelSourced = buildBrandContext(
    minimalInput({
      claims: [validClaim({ source_type: "model_inference", source_ref: "company-profile.pdf#page=3" })],
    }),
    registry()
  );
  assert.equal(modelSourced.ok, false);
  if (!modelSourced.ok) assert.equal(modelSourced.error.kind, "reference-violation");
});

test("an inference presented as a verified fact is rejected (INV-FACT-002)", () => {
  const result = buildBrandContext(
    minimalInput({
      claims: [
        validClaim({
          classification: "inference",
          source_type: "operator_input",
          source_ref: null,
          verification_status: "verified",
        }),
      ],
      identity: { names: [{ value: "Test Co", claim_ref: "claim_t_0001" }] },
    }),
    registry()
  );
  assert.equal(result.ok, false);
  if (!result.ok && result.error.kind === "validation-failed") {
    assert.match(result.error.issues[0]!.keyword, /INV-FACT-002/);
  } else {
    assert.fail(`expected validation-failed, got ${JSON.stringify(result)}`);
  }
});

test("a missing source, claim, or assumption reference is rejected", () => {
  const unknownIdentityClaim = buildBrandContext(
    minimalInput({ identity: { names: [{ value: "X", claim_ref: "claim_ghost" }] } }),
    registry()
  );
  assert.equal(unknownIdentityClaim.ok, false);
  if (!unknownIdentityClaim.ok) assert.equal(unknownIdentityClaim.error.kind, "reference-violation");

  const unknownContradictionClaim = buildBrandContext(
    minimalInput({
      contradictions: [{ claim_refs: ["claim_t_0001", "claim_ghost"], description: "d" }],
    }),
    registry()
  );
  assert.equal(unknownContradictionClaim.ok, false);
  if (!unknownContradictionClaim.ok) assert.equal(unknownContradictionClaim.error.kind, "reference-violation");

  const unknownMark = buildBrandContext(
    minimalInput({
      identity: {
        names: [{ value: "Test Co", claim_ref: "claim_t_0001" }],
        marks: ["src_ghost"],
      },
    }),
    registry()
  );
  assert.equal(unknownMark.ok, false);
  if (!unknownMark.ok) assert.equal(unknownMark.error.kind, "reference-violation");

  const unknownAudienceClaim = buildBrandContext(
    minimalInput({ audience: [{ claim_ref: "claim_ghost" }] }),
    registry()
  );
  assert.equal(unknownAudienceClaim.ok, false);
  if (!unknownAudienceClaim.ok) assert.equal(unknownAudienceClaim.error.kind, "reference-violation");
});

test("prompt-only mode cannot smuggle uploaded evidence or manufacture proof points", () => {
  const result = buildBrandContext(
    minimalInput({
      mode: "prompt-only",
      sources: [validSource()], // kind: document — not allowed in prompt-only
    }),
    registry()
  );
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.kind, "reference-violation");
    assert.match(result.error.message, /prompt-only/);
  }
});

test("cross-brand inputs are rejected", () => {
  const result = buildBrandContext(
    minimalInput({ claims: [validClaim({ brand_ref: "brand_other" })] }),
    registry()
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.kind, "reference-violation");
});
