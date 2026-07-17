// Canonical source references (DEC-0006, INV-FACT-001).
//
// A claim's provenance points at a source ARTIFACT, never at a mutable filename:
//   source:<source artifact_id>                  whole-source reference
//   source:<source artifact_id>#chars=<a>-<b>    character fragment of captured text
//   source:<source artifact_id>#page=<n>         page locator on a paged descriptor
//
// The form is deterministic and parseable, survives renames and filename
// collisions, and retains fragment locators. Filename-based references
// (e.g. "profile.pdf#page=3") are rejected, not silently migrated: re-issue the
// claim against the source artifact ID (contracts/README.md migration rule).

export const CANONICAL_SOURCE_REF =
  /^source:([A-Za-z0-9][A-Za-z0-9._-]{0,127})(?:#(?:chars=([0-9]{1,9})-([0-9]{1,9})|page=([1-9][0-9]{0,8})))?$/;

export type SourceFragment =
  | { kind: "chars"; start: number; end: number }
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
    return { sourceId, fragment: { kind: "chars", start: Number(m[2]), end: Number(m[3]) } };
  }
  if (m[4] !== undefined) {
    return { sourceId, fragment: { kind: "page", page: Number(m[4]) } };
  }
  return { sourceId, fragment: null };
}
