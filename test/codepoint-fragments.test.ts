// Multilingual proof of the #codepoints= locator semantics (DEC-0007):
// offsets are zero-based, half-open Unicode code-point positions — never UTF-16
// code units, UTF-8 bytes, or grapheme clusters. Every non-ASCII character in
// these tests is generated from a code point at runtime, so the repository
// language gate (English-only tracked files) stays clean.
import assert from "node:assert/strict";
import test from "node:test";
import { buildBrandContext, type BrandContextInput } from "../src/compile/build-brand-context.js";
import {
  codePointLength,
  codePointSlice,
  parseSourceRef,
} from "../src/kernel/source-ref.js";
import { classifyInput } from "../src/understand/classify-input.js";
import { BRAND, NOW, WS, contentStore, registry, validClaim } from "./helpers.js";

const ARABIC_BEH = String.fromCodePoint(0x0628); // Arabic letter, 1 code point = 1 UTF-16 unit
const GCLEF = String.fromCodePoint(0x1d11e); // supplementary plane, 1 code point = 2 UTF-16 units
const COMBINING_ACUTE = String.fromCodePoint(0x0301); // combining mark, its own code point

// 7 code points, 8 UTF-16 units: [beh][G-clef]Dubai
const MIXED = `${ARABIC_BEH}${GCLEF}Dubai`;

function compileFragment(content: string, start: number, end: number) {
  const store = contentStore("codepoints");
  const classified = classifyInput(
    [{ kind: "prompt", name: "prompt-cp", content }],
    { workspace: WS, brandRef: BRAND, createdAt: NOW, artifactIdPrefix: "src_cp" },
    registry(),
    store
  );
  assert.ok(classified.ok, JSON.stringify(classified));
  const source = classified.ok ? classified.value[0]! : {};
  const input: BrandContextInput = {
    artifactId: "bctx_cp_0001",
    workspace: WS,
    brandRef: BRAND,
    mode: "prompt-only",
    createdAt: NOW,
    sources: [source],
    claims: [
      validClaim({
        source_type: "client_statement",
        source_ref: `source:${String(source["artifact_id"])}#codepoints=${start}-${end}`,
      }),
    ],
    assumptions: [],
    contradictions: [],
    gaps: [],
    identity: { names: [{ value: "Test Co", claim_ref: "claim_t_0001" }] },
  };
  return buildBrandContext(input, registry(), store);
}

test("code-point coordinates are stable across ASCII, Arabic, supplementary-plane, and combining characters", () => {
  assert.equal(codePointLength("Dubai"), 5);
  assert.equal(codePointLength(ARABIC_BEH), 1);
  assert.equal(codePointLength(GCLEF), 1, "a surrogate pair is ONE code point");
  assert.equal(GCLEF.length, 2, "…but two UTF-16 units, which is exactly the ambiguity being retired");
  assert.equal(codePointLength(MIXED), 7);
  assert.equal(MIXED.length, 8);
  // A combining mark is its own code point: code points are not grapheme clusters.
  const decomposed = `caf${"e" + COMBINING_ACUTE}`;
  assert.equal(codePointLength(decomposed), 5);
  // Content is addressed exactly as captured — never normalized, so composed
  // and decomposed spellings of the same visible text have different lengths.
  const composed = decomposed.normalize("NFC");
  assert.equal(codePointLength(composed), 4);
  assert.notEqual(decomposed, composed);
});

test("the intended code-point range retrieves exactly the cited text, independent of UTF-16 widths", () => {
  // "Dubai" occupies code points [2, 7) of MIXED.
  assert.equal(codePointSlice(MIXED, 2, 7), "Dubai");
  // The same numbers fed to UTF-16 String.slice denote DIFFERENT text (a lone
  // low surrogate followed by "Duba") — the documented reason String.slice and
  // String.length are banned from fragment validation.
  assert.notEqual(MIXED.slice(2, 7), "Dubai");
  assert.equal(MIXED.slice(3, 8), "Dubai");
  // And the compiler accepts the code-point range.
  const compiled = compileFragment(MIXED, 2, 7);
  assert.ok(compiled.ok, JSON.stringify(compiled));
});

test("a range computed under UTF-16 assumptions is rejected as out of bounds in code-point space", () => {
  // In UTF-16 units "Dubai" is [3, 8), but MIXED has only 7 code points, so the
  // UTF-16-derived end offset overruns the code-point coordinate system.
  const utf16Assumed = compileFragment(MIXED, 3, 8);
  assert.equal(utf16Assumed.ok, false);
  if (!utf16Assumed.ok) {
    assert.equal(utf16Assumed.error.kind, "reference-violation");
    assert.match(utf16Assumed.error.message, /out of bounds/);
    assert.match(utf16Assumed.error.message, /7 code points/);
  }
});

test("inverted, empty, and out-of-bounds code-point ranges are rejected", () => {
  const inverted = compileFragment(MIXED, 5, 2);
  assert.equal(inverted.ok, false, "start > end must fail");
  const empty = compileFragment(MIXED, 3, 3);
  assert.equal(empty.ok, false, "start == end must fail (half-open range is empty)");
  const overrun = compileFragment(MIXED, 0, 999);
  assert.equal(overrun.ok, false, "end beyond the captured code-point length must fail");
});

test("the retired #chars= form is rejected by both the parser and the claim contract", () => {
  assert.equal(parseSourceRef("source:src_cp_0001#chars=2-7"), null);
  const rejected = registry().validate(
    "claim",
    validClaim({ source_type: "client_statement", source_ref: "source:src_cp_0001#chars=2-7" })
  );
  assert.equal(rejected.ok, false, "no silent compatibility fallback exists (DEC-0007 migration rule)");
  if (!rejected.ok) assert.equal(rejected.error.kind, "validation-failed");
});
