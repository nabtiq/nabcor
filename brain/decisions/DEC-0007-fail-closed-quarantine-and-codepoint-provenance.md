# DEC-0007 — Fail-closed quarantine and Unicode code-point provenance locators

decision_id: DEC-0007
title: "Quarantine fails closed until an authenticated human release authority exists; provenance fragments use Unicode code-point offsets; contracts move to 1.3.0"
date: 2026-07-17
status: ratified
proposed_by: "Phase 1A.2 correction task"
approved_by: "product owner — explicit Phase 1A.2 correction task instruction authorizing exactly these two architecture corrections"
approved_at: 2026-07-17

## Context

The Phase 1A.2 review reproduced two findings against the DEC-0006 kernel:

1. **Quarantine release was forgeable.** `FileContentStore.getQuarantined()`
   returned quarantined bytes to any caller supplying an ordinary object with
   non-empty `releasedBy`/`at`/`reason` strings, and `buildBrandContext()`
   compiled claims citing quarantined sources whenever the supplied source
   artifact carried a syntactically valid `quarantine-release` approvals entry.
   Schema validation proves only the shape of that metadata — it cannot
   authenticate a human, a session, a role, a signature, or any approval
   authority, and Q-001 (who holds gate authority) is unresolved. The runtime's
   own tests constructed the purported "human approval" as a plain object. The
   DEC-0006 claims of "human-only release" and "enforceable quarantine release"
   were therefore unsupported: the quarantine boundary held only against
   callers who declined to type three strings.
2. **`#chars=` fragment offsets had undefined multilingual semantics.** The
   compiler bounds-checked character fragments with JavaScript `String.length`,
   which counts UTF-16 code units, while no contract or document defined
   whether offsets meant bytes, UTF-16 units, code points, or grapheme
   clusters. For any text containing a supplementary-plane character (a UTF-16
   surrogate pair), the same numeric range denoted different text under
   different unit systems — reproducibly, a range that is out of bounds in
   code points was accepted under UTF-16 counting, and slicing by the same
   numbers produced broken text beginning with a lone surrogate. Provenance
   for non-ASCII content (including Arabic and any supplementary-plane or
   combining text) was ambiguous across languages and runtimes.

## Decision

1. **Quarantine fails closed.** Normal retrieval reads clear content only. The
   release-bearing read API is removed: the content store's public surface is
   exactly `put` and `get` (internal helpers are ECMAScript `#`-private), and
   no exported runtime path can read quarantined bytes. `buildBrandContext()`
   rejects every claim citing a quarantined source with a typed
   `quarantine-fail-closed` failure that names only artifact IDs (never
   captured content) and states that no authenticated human release authority
   exists until Q-001 is resolved. A `quarantine-release` approval on a source
   artifact may be recorded and retained as audit metadata, but it grants no
   authority. No authentication scheme, identity registry, role assignment,
   signature, or "trusted" flag is invented in this phase; the gate CLI, auth
   system, and provider gateway remain out of scope.
2. **Provenance fragments use Unicode code-point offsets.** The canonical
   fragment form is `source:<source artifact_id>#codepoints=<start>-<end>`:
   zero-based, half-open `[start, end)` Unicode code-point positions — never
   UTF-8 bytes, UTF-16 code units, or user-perceived grapheme clusters (a base
   character and its combining marks are separate code points). Validation and
   retrieval are code-point-aware (`Array.from`/string iteration); raw
   `String.length` and `String.slice` are prohibited for fragment coordinates.
   `start < end` remains required; bounds are verified against digest-verified
   captured text. Stored content is addressed exactly as captured: the runtime
   never normalizes Unicode content, so composed and decomposed forms are
   distinct addressable texts.
3. **The retired `#chars=` form is rejected, never reinterpreted.** There is
   no compatibility fallback. The migration rule is: re-issue each old
   reference as a `#codepoints=` reference computed against the original
   immutable captured content. Old numeric offsets are never automatically
   reinterpreted as code points. No real production artifacts existed, so no
   real-artifact migration occurred — examples, fixtures, and synthetic
   runtime fixtures were re-issued in the same change.
4. **Contract version.** These are meaning changes: `schema_version` for all
   contracts moves 1.2.0 → 1.3.0, synchronized across schemas, embedded
   examples, fixtures, and runtime-generated artifacts.
5. **Documentation truth.** DEC-0006 receives an append-only correction note;
   its text is not rewritten. Truth sources now say "quarantined and
   fail-closed pending authenticated human-gate implementation" and never
   "human-released", "authentic approval", or "enforceable human release"
   until the runtime can actually prove a human acted.

## Alternatives

- **Keep `getQuarantined` but validate the release object harder** (require a
  user-id format, timestamps, reasons of minimum length) — rejected: every
  such check validates shape, not authority; a forger types whatever shape is
  demanded. This is the exact failure mode under correction.
- **Invent an interim authentication mechanism** (an environment-variable
  operator identity, a "trusted caller" boolean, a signing key held by the
  runtime) — rejected: it fabricates the very authority Q-001 exists to
  assign, and an attacker-controllable input masquerading as authentication is
  worse than an honest fail-closed boundary.
- **Delete quarantined content instead of fencing it** — rejected: capture is
  evidence; the flagged material must stay auditable (and releasable once a
  real authority exists) rather than destroyed.
- **UTF-16 code-unit offsets (document the status quo)** — rejected: ties
  provenance semantics to one language runtime's string representation and
  makes offsets misleading for any supplementary-plane text; JVM/JS-specific
  counting is not a portable audit coordinate.
- **UTF-8 byte offsets** — rejected: byte positions can land inside a
  multi-byte sequence, denoting invalid text; every consumer would need
  byte-level decoding to audit a fragment.
- **Grapheme-cluster offsets** — rejected: cluster segmentation depends on the
  Unicode version of the segmenter, so offsets could silently change meaning
  across runtimes and upgrades; code points are version-stable.
- **Silent `#chars=` → `#codepoints=` fallback for old references** —
  rejected: for any non-ASCII content the old numbers mean different text
  under the new semantics; a silent fallback would relabel ambiguous
  coordinates as precise ones. Re-issuance against the immutable captured
  content is cheap and exact, and no production artifacts exist.

## Evidence and assumptions

Evidence: both findings were reproduced against the pre-correction kernel at
main `b613ea2` before any fix was written — the forged release object and the
schema-valid fabricated approvals entry both unlocked quarantined content, and
a supplementary-plane test string showed the same numeric range accepted under
UTF-16 counting while out of bounds in code points. Post-fix, the same attack
scripts fail closed, and deterministic tests cover: normal retrieval cannot
read quarantine; no exported store method reads quarantined bytes; a complete
schema-valid fabricated approval cannot compile; the typed failure leaks no
content; and code-point coordinates are stable across ASCII, Arabic,
supplementary-plane, and combining-mark text generated programmatically from
code points (the repository stays English-only).

Authorization evidence: this correction was explicitly authorized by the
product owner's Phase 1A.2 correction task instruction. That instruction
authorizes exactly these two corrections; it does not name gate-role
identities (Q-001) and does not select providers, data policy, or spend
ceilings (Q-002). Both questions remain open.

Assumption: code-point offsets remain the fragment coordinate system when real
binary capture (PDF/DOCX/OCR) lands; if a future extraction pipeline needs
byte or page-region coordinates, that is an extension, not a reinterpretation.

## Consequences

Flagged content is now structurally fenced: nothing in the runtime can read it
and no artifact metadata can free it, so "quarantined" means quarantined even
against the runtime's own callers. The cost is honest: legitimately flagged
material is unusable until Q-001 delivers an authenticated release authority —
a compile-time typed failure tells the caller exactly that. Fragment
provenance is now portable across languages and runtimes: the same offsets
denote the same text for ASCII, Arabic, supplementary-plane, and combining
text, and a UTF-16-derived range fails loudly instead of shifting meaning.
Anything authored against 1.2.0 shapes must be re-issued as 1.3.0.

## Revisit trigger

Q-001 is answered by a ratified decision naming gate-role identities and an
authenticated approval mechanism is designed — that decision supersedes the
fail-closed rule with a real release path (store read API + compile
acceptance) behind it. Independently: real binary capture or extraction lands
and needs fragment coordinates beyond code-point offsets on captured text.

## Supersession

supersedes: null (corrects the quarantine-release and fragment-semantics
statements of DEC-0006 via an append-only note there; DEC-0006's capture,
dependency, and canonical-reference decisions stand)
superseded_by: null
