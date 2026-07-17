// Canonical source references (DEC-0006, DEC-0007, INV-FACT-001).
//
// A claim's provenance points at a source ARTIFACT, never at a mutable filename:
//   source:<source artifact_id>                        whole-source reference
//   source:<source artifact_id>#codepoints=<a>-<b>     code-point fragment of captured text
//   source:<source artifact_id>#page=<n>               page locator on a paged descriptor
//
// Code-point fragment semantics (DEC-0007):
//   - offsets are ZERO-BASED, HALF-OPEN Unicode code-point positions [start, end);
//   - they count Unicode code points (what the JS string iterator and
//     Array.from yield) — NOT UTF-8 bytes, NOT UTF-16 code units, and NOT
//     user-perceived grapheme clusters (a base character and its combining
//     marks are separate code points);
//   - offsets address the captured bytes exactly as captured: the store never
//     normalizes Unicode content, so composed and decomposed forms are distinct.
//
// The form is deterministic and parseable, survives renames and filename
// collisions, and retains fragment locators. Filename-based references
// (e.g. "profile.pdf#page=3") and the retired UTF-16-ambiguous `#chars=` form
// are rejected, not silently migrated: re-issue the claim against the original
// immutable captured content with code-point offsets (contracts/README.md
// migration rule). Old offsets are never reinterpreted automatically.

export const CANONICAL_SOURCE_REF =
  /^source:([A-Za-z0-9][A-Za-z0-9._-]{0,127})(?:#(?:codepoints=([0-9]{1,9})-([0-9]{1,9})|page=([1-9][0-9]{0,8})))?$/;

export type SourceFragment =
  | { kind: "codepoints"; start: number; end: number }
  | { kind: "page"; page: number };

export interface ParsedSourceRef {
  sourceId: string;
  fragment: SourceFragment | null;
}

/** Parse a canonical source reference; null when the form is not canonical. */
export function parseSourceRef(ref: string): ParsedSourceRef | null {
  const m = CANONICAL_SOURCE_REF.exec(ref);
  if (!m) return null;
  const sourceId = m[1]!;
  if (m[2] !== undefined && m[3] !== undefined) {
    return { sourceId, fragment: { kind: "codepoints", start: Number(m[2]), end: Number(m[3]) } };
  }
  if (m[4] !== undefined) {
    return { sourceId, fragment: { kind: "page", page: Number(m[4]) } };
  }
  return { sourceId, fragment: null };
}

/**
 * Unicode code-point length of a string — the coordinate system for
 * `#codepoints=` fragments. Never use `String.length` (UTF-16 code units) for
 * fragment validation: a supplementary-plane character is one code point but
 * two UTF-16 units.
 */
export function codePointLength(text: string): number {
  return Array.from(text).length;
}

/**
 * The substring denoted by half-open code-point range [start, end) — the exact
 * text a `#codepoints=` fragment cites. Callers must bounds-check first
 * (start < end, end <= codePointLength).
 */
export function codePointSlice(text: string, start: number, end: number): string {
  return Array.from(text).slice(start, end).join("");
}
