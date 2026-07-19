# Provenance and Confidence Model

**Version:** 1.2 · 2026-07-17 · how NABCor separates truth from inference.
Enforced by `contracts/claim.schema.json`, `contracts/source.schema.json`, gate G4,
and invariants INV-FACT-001/002/003; capture and canonical references per
DEC-0006/DEC-0007.

## 1. Source types

| `source_type` | Meaning | Default trust |
|---|---|---|
| `uploaded_document` | client-provided file (PDF, docx, brand guide) | high for facts about the client, still fragment-cited |
| `uploaded_image` | client photo, logo, screenshot of their material | high (documentary) |
| `client_statement` | something the client said/wrote directly (brief, chat, email) | high, cite the communication |
| `operator_input` | the operator's typed knowledge | medium; mark who asserted it |
| `public_web` | fetched public page (client's own site vs third-party — record which) | medium; snapshot + URL + date |
| `reference_material` | "make it feel like this" inputs | zero factual weight; design intent only — unless it carries the client's own brand/content, in which case it is ALSO mined (BC-001 FAIL-01 fix) |
| `model_inference` | model-derived statement | never factual on its own |
| `model_generation` | created content/assets | never evidence of anything |

## 2. Source capture, canonical references, and quarantine (DEC-0006)

The audit chain is: **source artifact → captured content → fragment → claim**.

- **Capture.** Every source artifact carries a required `capture` block. Inline
  prompt/text/Markdown content is persisted to the immutable, SHA-256-addressed,
  workspace/brand-isolated content store *before* the source artifact is
  returned; the artifact records `content_ref` (`sha256:<hex>`), `sha256`,
  `bytes`, `media_type`, and `safety` — never the content inline.
  PDF/DOCX/image/logo descriptors have no bytes yet and are `descriptor-only`;
  URLs are `external-unfetched`. Nothing is called "captured" unless its exact
  bytes are retrievable and digest-verifiable.
- **Canonical references.** A claim's `source_ref` is
  `source:<source artifact_id>[#codepoints=<start>-<end>|#page=<n>]` —
  deterministic, parseable, tied to the source artifact ID, unaffected by
  renames or filename collisions, fragment-preserving. Fragment offsets are
  **zero-based, half-open Unicode code-point positions** `[start, end)`
  (DEC-0007): they count Unicode code points, never UTF-8 bytes, UTF-16 code
  units, or grapheme clusters — a combining mark is its own code point.
  Captured content is addressed **exactly as captured**; the runtime never
  normalizes Unicode, so composed and decomposed forms are distinct texts.
  Code-point fragments apply to captured text only and are bounds-checked and
  read back through the recorded content reference at compile time. Page
  references on descriptors are structurally valid but
  **not-yet-content-verified** — no page contents were checked, because no
  bytes exist. Filename-based references and the retired UTF-16-ambiguous
  `#chars=` form are rejected, never silently migrated: re-issue against the
  original immutable captured content with code-point offsets.
- **Detection vs flagging vs quarantine vs release.** These are four distinct
  things. *Detection* is the bounded deterministic scanner (obvious seeded
  attacks only — it does not claim completeness). *Flagging* is
  `injection_flag`/`injection_note` on the source artifact. *Quarantine* is
  enforcement: flagged inline content is captured only into an isolated
  quarantine namespace, no runtime path reads quarantined bytes, and
  brand-context compilation rejects every claim citing it with a typed
  failure. *Release* **does not exist yet**: the runtime cannot authenticate a
  human, and quarantine release requires an independent reviewer and an
  authenticated gate mechanism that do not yet exist (DEC-0008), so
  quarantine is fail-closed (DEC-0007). A `quarantine-release`
  approvals entry on a source artifact is audit metadata only and grants no
  authority — schema validation proves shape, not that a human acted.

## 3. Claim classifications

- `factual` — asserts a checkable fact about the brand/world. **Must** carry provenance
  (source fragment) or it cannot exist as factual (INV-FACT-001).
- `inference` — model- or operator-derived judgment ("audience likely includes law
  firms"). Carries the derivation basis; never renders in a factual role.
- `hypothesis` — a creative bet ("a forensic-noir visual world will differentiate").
  Lives in territories/directions; evaluated, not verified.
- `preference` — a taste statement with a source event.

## 4. Verification states and transitions

```text
extracted/proposed
  → unconfirmed        (default for anything not fragment-backed)
  → verified           (fragment-backed factual claim, or human confirmation — record who)
  → contradicted       (a Contradiction resolved against it; kept, never deleted)
  → expired            (validity window passed or staleness rule fired)
  → rejected           (human struck it)
```

Transitions that require a human: `unconfirmed → verified` for inference-class claims
(INV-HUM-001(3)); any contradiction resolution. Deterministic transitions: expiry.

Claim artifacts are immutable per version (INV-VER-001): a transition that
changes a stored claim's state is recorded as a NEW revision superseding
the old one — never an in-place edit. Current truth is derived from
validated lineage heads (the active-claim projection, DEC-0012), and a
`contradicted`, `rejected`, or `expired` head is retained for audit but
inactive: it creates no active contradictions and satisfies no required
slots. Omission is not resolution — canonical claim membership comes from
an Artifact Store snapshot of the exact workspace/brand namespace
(DEC-0013): analysis enumerates the store rather than trusting a supplied
array, the analysis artifact is digest-bound to exactly the claims it
loaded, and compilation reconciles that snapshot against the live store,
failing closed on any claim that appeared, disappeared, or changed since
analysis (stale analysis requires re-analysis). Applying a contradiction
resolution (creating the losing claim's `contradicted` revision) requires
the authenticated human-gate mechanism (Q-009), which does not yet exist:
a shape-valid approval object proves shape, not that a human acted.

## 5. Confidence rules

- Confidence is a 0–1 float **with a stated basis** — source quality, corroboration
  count, extraction certainty — recorded in `confidence_basis`. A bare number is
  invalid (INV-EVAL-001 spirit).
- Bands used in UX and gating: `≥0.9` render-as-fact (verified only) · `0.6–0.9`
  usable with hedged/provisional presentation · `<0.6` internal-only, question-shaped
  in user surfaces.
- Confidence never substitutes for provenance: a 0.99 unverified claim still cannot
  render in a factual role.
- Corroboration across independent sources may raise confidence; repetition within one
  source may not.

## 6. Contradiction handling

Detection is a standing UNDERSTAND duty. What exists today is the
**deterministic Tier-0 structured layer** (DEC-0011,
`src/understand/analyze-structured-truth.ts`): claims carrying explicit fact
metadata (`fact_key`, `normalized_value`, `normalization_basis`) are grouped
by slot and compared with exact, type-sensitive equality — no case folding,
no Unicode normalization, no unit conversion, no fuzzy matching. Two or more
distinct values in a single-cardinality slot become one open contradiction in
a `truth-analysis` artifact; blocking status comes from the slot's truth
profile. Claims without structured fact metadata are listed explicitly as
unstructured — never keyword-parsed or silently ignored. The catalog's
semantic `detect-contradictions` capability (paraphrase conflicts in
unrestricted prose) remains unimplemented and prohibited under DEC-0009.

Each detected contradiction is surfaced to a human with status fixed `open`;
resolution is a decision record — never an analyzer output; the losing claim
moves to `contradicted` and stays queryable (so the same conflict is never
re-litigated — the BC-001 Josour/Nosour (transliterated) lesson, FAIL-04).
Contradicted claims are inactive as current truth (DEC-0012): analysis runs
over the effective lineage heads only, so a resolved conflict stays closed
on re-analysis while the loser remains visible in the analysis's inactive
listing. Applying a resolution — actually creating that `contradicted`
revision from a decision — is not yet implemented. The authenticated
human-gate mechanism it requires now exists (DEC-0014 closed Q-009: signed
Ed25519 approval evidence verified against the trusted policy and
registry, with atomic single-use nonce consumption) and the real Product
Owner key is enrolled (DEC-0015: registry v2 pinned by policy v2, so
ordinary fact-resolution approval can verify), but the application step
itself — composing an authorized approval with claim-revision creation and
DEC-0013 snapshot staleness — is deferred follow-on work. A schema-valid decision or
approval artifact remains non-evidence that a human acted.
Publication-critical facts (names, contact, domains) with open contradictions
**block** publication surfaces (G4/G5).

## 7. Expiration and staleness

- Claims may carry `valid_from`/`valid_until`; expiry is deterministic.
- Class-based staleness defaults (reviewable): contact facts and pricing re-confirm at
  each new project for the brand; audience/market inferences expire after 12 months;
  documentary asset facts (alpha, resolution) never expire but re-verify on file change.
- Stale claims behave like `unconfirmed`: usable only in provisional roles until
  re-confirmed.

## 8. Human confirmation

A confirmation records: user, timestamp, claim version, and what they saw (the
statement + its evidence). Confirmations are approvals in the domain-model sense and
appear on the claim's envelope. Bulk "confirm all" is prohibited in UX — confirmation
is per-claim for publication-critical classes.

Envelope confirmations are audit metadata, not runtime authority. Where a
confirmation must carry AUTHORITY — gating an action the runtime performs —
it takes the DEC-0014 form: signed approval evidence over the exact claim
version's content digest, verified against the active human-gate policy and
authority registry and consumed exactly once. The digest binding means a
confirmation of one claim revision never silently covers a later revision.

## 9. How generated content references claims

Every copy slot in a spec (`website-spec`, `social-asset-spec`) carries `claim_refs`:
the claims its statements rely on. Rules:

- A statement in a **factual role** (proof points, counts, names, credentials) must
  resolve to `verified` claims — G4 blocks otherwise.
- **Positioning/voice language** needs no claims but must not smuggle facts ("trusted
  by leading firms" is a factual claim in disguise — G4's paraphrase check targets
  exactly this, ADVISORY at foundation).
- A needed-but-missing fact renders as an explicit slot: `[X years in operation —
  confirm]` — never an invented value.

## 10. How unsupported claims are blocked

Layered: (1) schema — factual claims without provenance fail validation at creation;
(2) G4 deterministic scan — built output strings (names, numbers, contacts, certs)
must match ledger-backed claims (BLOCKING); (3) G4 model paraphrase check — catches
reworded fabrications (ADVISORY until calibrated); (4) publication gate — human
reviews the claim report before anything ships (INV-HUM-001).

## 11. Provisional creative content labeling

Anything derived from assumptions or inferences carries `provisional: true` on its
artifact/section and renders with a visible provisional treatment in review surfaces.
Provisional content may ship to *preview*, never to *publication*, while its
load-bearing assumptions are open and high-risk.

## 12. Visual asset classification

Every asset: `documentary` (real, unstaged evidence — client photos of real work) ·
`illustrative` (real or generated, conveys atmosphere, claims nothing specific) ·
`generated` (model-created; carries generation metadata + illustrative marker where
user-facing) · `conceptual` (mockups, territory sketches — internal/review only).
Rules: documentary assets are corrected, never regenerated (BC-001 practice);
generated assets never occupy documentary slots (INV-FACT-003); classification is
intake/creation-mandatory and travels with every variant.

## 13. Structured examples

Verified factual claim:

```json
{
  "claimId": "claim_001",
  "statement": "The company operates in Dubai",
  "classification": "factual",
  "sourceType": "uploaded_document",
  "sourceRef": "source:src_0001#page=3",
  "confidence": 0.98,
  "confidenceBasis": "explicit statement in client's own profile document",
  "verificationStatus": "verified",
  "validFrom": null,
  "validUntil": null
}
```

Unconfirmed inference:

```json
{
  "claimId": "claim_002",
  "statement": "The likely audience includes legal firms",
  "classification": "inference",
  "sourceType": "model_inference",
  "confidence": 0.62,
  "confidenceBasis": "category norm for forensic consultancies; no client evidence",
  "verificationStatus": "unconfirmed"
}
```

Contradicted claim (kept):

```json
{
  "claimId": "claim_017",
  "statement": "The company name is Nosour Al-Azl (transliterated; Arabic script prohibited in repository files)",
  "classification": "factual",
  "sourceType": "uploaded_document",
  "sourceRef": "source:src_0001#page=1",
  "confidence": 0.3,
  "confidenceBasis": "conflicts with logo and brochure spelling; resolved against by DEC-brand decision",
  "verificationStatus": "contradicted",
  "resolutionDecisionRef": "DEC-XXXX (brand-scoped)"
}
```
