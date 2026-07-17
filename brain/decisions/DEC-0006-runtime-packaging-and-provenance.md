# DEC-0006 — Runtime packaging truth and auditable source provenance

decision_id: DEC-0006
title: "Ajv as a declared runtime dependency; immutable content-addressed capture; canonical source references; enforceable quarantine"
date: 2026-07-17
status: ratified
proposed_by: "Phase 1A.1 correction task"
approved_by: "product owner — explicit Phase 1A.1 correction task instruction authorizing this decision"
approved_at: 2026-07-17

## Context

The Phase 1A review confirmed four findings the kernel could not honestly defend:

1. `ajv` and `ajv-formats` are imported by the compiled contract registry at
   runtime but were declared as devDependencies, so a production-only install
   was empty and the "zero runtime dependencies" claim in DEC-0005 was false.
2. Prompt/text/Markdown content was scanned and then discarded; claims cited
   fragments (e.g. `prompt-0001#chars=55-96`) of text nobody could audit later.
3. Image and logo descriptors without an explicit visual classification were
   silently assigned `documentary`, violating the spirit of INV-FACT-003.
4. The runtime called an injection *flag* a *quarantine* while no isolated
   namespace or downstream enforcement existed.

## Decision

1. **Runtime dependency truth.** `ajv` and `ajv-formats` are declared runtime
   `dependencies`; `typescript` and `@types/node` remain devDependencies. The
   boundary is exactly these four packages, enforced by tests, including an
   isolated `npm ci --omit=dev` production-install smoke test. The DEC-0005
   decisions that no provider SDK and no application/agent framework exist are
   unchanged. No bundler is adopted: vendoring or bundling Ajv would hide a
   real dependency rather than declare it, for zero packaging benefit at this
   phase.
2. **Immutable content-addressed capture.** Inline prompt/text/Markdown content
   is persisted by the kernel's content store before a source artifact is
   returned: SHA-256 addressed, immutable, workspace/brand isolated, and
   deduplicated by digest within one namespace. The source artifact records a
   required `capture` block (status, `content_ref`, `sha256`, `bytes`,
   `media_type`, `safety`) and never the content inline. Descriptor-only inputs
   (PDF/DOCX/image/logo) are `descriptor-only`; URLs are `external-unfetched`.
   No file reading, OCR, or fetching exists in this phase.
3. **Canonical source references.** Claim provenance uses
   `source:<source artifact_id>[#chars=<a>-<b>|#page=<n>]` — tied to the source
   artifact ID, independent of filenames and renames, fragment-preserving.
   Character fragments on captured text are bounds-checked and verified through
   the recorded content reference at compile time. Filename-based references
   are rejected at the schema layer; the migration rule is re-issuing the claim
   against the source artifact ID, with no silent fallback.
4. **Enforceable quarantine.** Deterministically flagged inline content is
   captured only into an isolated quarantine namespace. Normal retrieval cannot
   return it; brand-context compilation rejects claims citing quarantined
   sources unless the source artifact carries a human `quarantine-release`
   approval; the runtime never fabricates such an approval. Detection (scanner),
   flagging (`injection_flag`), quarantine (namespace + retrieval denial +
   compile rejection), and human release are four distinct things and are
   documented as such. The scanner remains a bounded heuristic for obvious
   seeded attacks and says so.
5. **Visual classification honesty.** Unclassified image/logo descriptors
   record `visual_classification: null` (explicitly unresolved). Documentary
   status requires an explicit supplied classification; downstream documentary
   use additionally remains behind human evidence gates (INV-FACT-003).
6. **Contract version.** These are meaning changes: `schema_version` for all
   contracts moves 1.1.0 → 1.2.0 with fixtures migrated in the same change (see
   `contracts/README.md`). No real production artifacts existed to migrate.

## Alternatives

- **Bundle Ajv into the build output** — hides the dependency instead of
  declaring it, complicates security updates, adds a build tool the repository
  evidence does not justify. Rejected.
- **Vendor a minimal validator** — a second source of truth for draft-07
  semantics; the exact risk DEC-0005 rejected for Python. Rejected.
- **Store captured content inline in the source artifact** — bloats every
  artifact read, spreads sensitive text across every consumer, and breaks the
  content/metadata separation needed for quarantine. Rejected.
- **Keep filename-based claim references with a compatibility fallback** — an
  ambiguous resolution path where two files sharing a name can satisfy each
  other's citations; exactly the audit hole under correction. Rejected.
- **Treat the injection flag alone as sufficient** — a flag without an
  enforcement boundary is a claim the runtime cannot keep; the review finding
  this decision corrects. Rejected.

## Evidence and assumptions

Evidence: the four review findings are reproducible against the pre-correction
kernel (the dependency finding by `npm ci --omit=dev`; the others by reading
`classify-input.ts` and `build-brand-context.ts` at the reviewed SHA).
Assumption: SHA-256 content addressing and file-per-blob storage stay adequate
until real (non-synthetic) capture volumes exist; no performance claim is made.

## Consequences

Production installs carry Ajv and work without dev tooling. Every captured
character a claim cites can be re-read and digest-verified later. Renaming or
colliding filenames can no longer alter claim provenance. Flagged content is
structurally fenced until a human releases it. The contracts are strictly
narrower; anything authored against 1.1.0 shapes must be re-issued.

## Revisit trigger

Real capture of binary sources (PDF/DOCX/image bytes), URL fetching, or provider
extraction lands (Q-002 closes); content volume makes file-per-blob storage a
measured bottleneck; or a future runtime needs a dependency beyond the declared
boundary — each requires a superseding or extending decision record.

## Supersession

supersedes: null (corrects the dependency statement of DEC-0005 via an
append-only note there; the DEC-0005 runtime selection itself stands)
superseded_by: null
