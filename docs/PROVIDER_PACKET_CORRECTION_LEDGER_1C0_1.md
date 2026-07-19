# Provider Packet Correction Ledger — Phase 1C.0.1

**Purpose:** the append-only record of every statement corrected in the
Phase 1C.0 provider-enablement evidence base after independent review
found a material contradiction with current official Google
documentation. The original Phase 1C.0 packet (merged in PR #15) is
preserved in Git history at `51a1121d`; nothing was silently rewritten —
this ledger IS the correction record, and the corrected documents cite
it. All re-verification was performed against live official pages on
2026-07-19; the full re-verified source set is in the packet's §12 as
amended.

**Status effect: none on authority.** DEC-0018 remains `proposed`,
`approved_by: null`; Q-010 remains open; no provider is enabled; the
active gateway policy is unchanged and CI-guarded; EXP-0001 remains
unexecuted.

Classification legend: CONFIRMED_ERROR (the merged claim was false),
AMBIGUOUS (the merged claim was readable in a false way), INCOMPLETE
(true but missing a load-bearing distinction), STILL_CORRECT
(re-verified unchanged; recorded because the correction notice or
re-verification touched it).

---

## C1 — Gemini Developer API ZDR availability

- **Original:** packet §5 row 18: "Developer API: no zero-retention
  offering [I from G6/G13/G14]".
- **Classification:** **CONFIRMED_ERROR.** The inference was drawn from
  the terms, logs-policy, and Interactions pages without locating the
  dedicated ZDR page. An official page directly contradicts it.
- **Official evidence:** https://ai.google.dev/gemini-api/docs/zdr —
  "Zero data retention in the Gemini Developer API" — last updated
  2026-05-28 UTC, accessed 2026-07-19. When a project's ZDR request is
  approved, "all user content (prompts and responses) and identifiable
  metadata ... are cleared prior to logging. The resulting record is
  marked as sanitized and contains zero identifiable user data."
- **Corrected claim:** the Gemini Developer API HAS a documented,
  CONDITIONAL zero-data-retention posture: PROJECT-APPROVAL for
  abuse-log sanitization, combined with a self-serve restriction bundle
  (`store=false` on the Interactions API; no Google Search grounding; no
  Maps grounding; no retained Files API objects; no explicit
  `cached_content` caching; no Live API `SessionResumptionConfig`).
  Implicit in-memory caching is explicitly ZDR-compatible ("strictly in
  RAM (not at-rest), isolated at the project level, ... 24-hour TTL").
  The request MECHANISM is not documented on official pages (UNKNOWN).
- **Impact on comparison:** matrix row 18 rewritten; new weighted
  criteria "attainable ZDR" and "ZDR requirements" score Google 4/5
  (−1 uncertainty for the undocumented mechanism) and 3/5 respectively —
  the strongest published API-level abuse-log story of the three.
- **Impact on options:** Option A/B/C definitions updated to name the
  corrected Google capability; recommendation recomputed (see C8).
- **Cost/threat/gate changes:** threat model gains the retention
  taxonomy and the Gemini conditional-ZDR gate set (T07a); cost model
  unchanged (ZDR does not alter synthetic-phase pricing).
- **Regression guard:** validator now fails on any claim that the
  Gemini Developer API "has no ZDR" (see §8 hardening) and requires the
  conditional-ZDR distinctions to be present.

## C2 — ZDR-project approval vs `store=false`

- **Original:** the merged packet's row 24/18 treatment allowed reading
  "`store=false`" as the Gemini statelessness/zero-footprint control.
- **Classification:** **INCOMPLETE** (and would become CONFIRMED_ERROR
  if read as "store=false alone yields ZDR").
- **Official evidence:** the /docs/zdr page separates the two: without
  ZDR approval "Google logs prompts and responses for a limited period
  of time" regardless of `store`; `store=false` only opts out of the
  Interactions default state storage (interactions page, updated
  2026-07-16: "By default, the API stores all Interaction objects
  (store=true)").
- **Corrected claim:** `store=false` removes DEFAULT REQUEST-STATE
  STORAGE only; abuse-monitoring logging continues until a project's
  ZDR request is approved (which sanitizes logs before writing). The
  two controls are independent and BOTH required (plus the feature
  restrictions in C3) for a zero-data footprint.
- **Impact:** matrix rows 17/18/24 rewritten; threat model T07a gate
  requires ZDR_NOT_VERIFIED reporting until approval is evidenced.
- **Regression guard:** validator fails if the packet implies
  `store=false` alone proves Gemini ZDR.

## C3 — Gemini features incompatible with a zero-data footprint

- **Original:** not enumerated (the merged packet had no Gemini ZDR
  concept to scope).
- **Classification:** **INCOMPLETE.**
- **Official evidence:** /docs/zdr: Search grounding stores prompts,
  context, and output 30 days with "no way to disable the storage";
  Maps grounding likewise; Files API objects are at-rest until
  deleted/expired (48h — files page, updated 2026-07-06); explicit
  `cached_content` must not be used; Live API session resumption
  retains session state up to 24 hours.
- **Corrected claim:** a Gemini zero-data footprint requires avoiding
  Search grounding, Maps grounding, retained Files, explicit caching,
  and session resumption — all self-serve avoidances — on top of C1's
  approval and C2's `store=false`.
- **Impact:** threat model T07a lists the exact conditional gate set an
  implementation must enforce if Gemini is ever selected.
- **Regression guard:** the required-distinction sentinel includes the
  feature-restriction list.

## C4 — Anthropic standard 30-day deletion posture

- **Original:** packet row 17 presented the docs-page "not retained by
  default" and the privacy article's 30-day deletion as an unreconciled
  tension (UNKNOWN reconciliation), leaning on the stronger docs
  wording elsewhere.
- **Classification:** **AMBIGUOUS** (both sources were quoted, but the
  conservative default was not adopted as the operative claim).
- **Official evidence:** privacy article 7996866 (accessed 2026-07-19):
  "we automatically delete inputs and outputs on our backend within 30
  days of receipt or generation," with exceptions (longer-lived
  services such as Files, agreed ZDR, Usage Policy enforcement, legal
  requirements). The docs retention page ITSELF defers: "For
  Anthropic's standard retention policies outside these arrangements,
  see the commercial data retention policy" — linking that article.
- **Corrected claim:** the operative conservative public default is
  **automatic backend deletion within 30 days, subject to the listed
  exceptions**. The docs page's "not retained by default" is
  feature-level design language subordinate to the commercial policy;
  the prior "tension" is resolved in the conservative direction, not
  left UNKNOWN.
- **Impact:** row 17 rewritten; "default retention" criterion scores
  Anthropic 3/5 on the conservative reading; threat model T07 and the
  implementation posture describe Anthropic retention as "up to 30
  days unless a ZDR agreement is evidenced".
- **Regression guard:** validator fails on any claim that standard
  Anthropic Messages calls have "zero retention" by default.

## C5 — Anthropic stateless transport vs backend retention

- **Original:** packet rows 24/29 and Option A used "stateless-by-
  default" as a headline property, which is readable as "no backend
  retention".
- **Classification:** **AMBIGUOUS.**
- **Official evidence:** as C4; statelessness describes request/
  conversation-state semantics (no server-side conversation objects to
  manage or delete), not the backend deletion window.
- **Corrected claim:** Anthropic standard Messages calls are
  stateless in the REQUEST-STATE sense (no provider-side conversation
  state or store flag to manage) while the backend deletion window is
  up to 30 days (C4). The two properties are stated separately
  everywhere; "stateless" is never offered as a retention claim.
- **Impact:** Option A benefit reworded to "no request-state storage
  or store-flag surface"; "operational complexity" criterion keeps the
  benefit; "default retention" criterion carries the 30-day posture.
- **Regression guard:** validator fails if the packet equates
  stateless transport with zero retention.

## C6 — Anthropic ZDR agreement requirement

- **Original:** row 18 said ZDR "[RC — contact sales]" — correct but
  thin.
- **Classification:** **STILL_CORRECT** (re-verified; enriched).
- **Official evidence:** docs retention page (accessed 2026-07-19):
  "To request ZDR for your organization, contact the Anthropic sales
  team"; per-organization enablement; eligible/qualified/ineligible
  feature lists; flagged content retained up to 2 years EVEN under
  ZDR; Covered Models (Claude Fable 5, Claude Mythos 5) require 30-day
  retention and are ZDR-ineligible (support article 15425695: retained
  "for at least 30 days and then automatically deleted, unless ...
  safety investigation or ... legally required").
- **Corrected claim:** unchanged classification (NEGOTIATED-CONTRACT),
  now with the eligibility taxonomy recorded and the Covered-Model
  exclusion re-confirmed.
- **Impact:** none on scores beyond documentation depth.
- **Regression guard:** covered by C4/C5 guards.

## C7 — OpenAI re-verification deltas (adjacent corrections found)

- **Original:** row 25 marked the OpenAI self-set budget hard-stop
  UNKNOWN outright; row 24 claimed "Chat Completions stores by default
  for new accounts"; §12 cited platform.openai.com URLs.
- **Classification:** **INCOMPLETE** (budget), **AMBIGUOUS →
  downgraded** (chat store default), **STILL_CORRECT-with-URL-drift**
  (docs domain).
- **Official evidence (accessed 2026-07-19):** error-codes guide ties
  org/project monthly budgets to 429 rejections ("Your monthly budget
  is set too low for your organization's usage ... You exceeded your
  current quota"); the your-data table shows Chat Completions
  application-state retention "None, see below for exceptions" while
  no reachable official page states the Chat `store` parameter
  default; docs 301-redirect from platform.openai.com to
  developers.openai.com; Responses 30-day default storage and
  `store:false` re-verified; pricing re-verified with new
  short/long-context split (long-context 2x; our workload is
  short-context), gpt-5.6 cache-write prices, and the 10% residency
  uplift; org ID-verification article still 403 (UNKNOWN).
- **Corrected claim:** budget enforcement upgraded to
  INFERRED-from-official (429-on-budget wording; help-center
  confirmation unreachable); Chat Completions `store` default
  downgraded to UNKNOWN (the Responses default-storage claim stands
  verbatim); pricing scoped to Standard/short-context.
- **Impact:** "spend hard-stop reliability" scores OpenAI 3/5 (4 − 1
  uncertainty) instead of a raw UNKNOWN; rows 24/25/28 rewritten;
  Option B risk wording updated.
- **Regression guard:** none needed (no prohibited-claim class); the
  human re-verification rule (§8 note) covers fact drift.

## C8 — Downstream recommendation language

- **Original:** Option A/B/C texts, the recommendation paragraph, and
  DEC-0018 rested on the pre-correction rows (including "Google ...
  no zero-retention offering" as a Google weakness and Anthropic
  "stateless-by-default" as a quasi-retention benefit).
- **Classification:** **INCOMPLETE** (the recommendation was not
  invalid, but its stated basis included one false claim and one
  ambiguous one).
- **Corrected claim:** the comparison was RECOMPUTED from the corrected
  evidence via the new explicit weighted-criteria model (packet §5b):
  baseline scores Anthropic 4.22, OpenAI 3.92, Google 3.25 (of 5).
  Sensitivity: privacy/ZDR-dominant → Anthropic 3.82 / OpenAI 3.51 /
  Google 3.10; structured-output-dominant → Anthropic 4.46 / OpenAI
  4.25 / Google 2.87; **cost-dominant → OpenAI 3.95 / Google 3.83 /
  Anthropic 3.48 (Anthropic LOSES this case — published, not
  hidden)**; hard-stop-dominant → Anthropic 4.47 / OpenAI 3.63 /
  Google 3.49. The recommendation remains Option A (Anthropic) on the
  baseline and three of four sensitivity cases; the packet now states
  explicitly why Google's corrected ZDR does not flip it (ZDR weighs
  little in a synthetic-only phase; Google's default-retention posture
  and syntactic-only structured output dominate its score) and that a
  cost-dominant Product Owner should choose Option B.
- **Impact:** packet §5b added; §10 options and recommendation
  rewritten from the recomputed scores; DEC-0018 correction note
  appended.
- **Regression guard:** the validator's proposed-status and
  distinction guards; the scoring table itself carries per-cell
  evidence tags so future edits are auditable.

---

## Re-verification coverage note

Anthropic: all nine requested areas re-verified live with zero
divergences from the merged packet's pricing/caps/lifecycle/structured-
output facts (only the retention FRAMING corrected, C4/C5). Google: all
eleven areas re-verified; pricing/caps/models unchanged; grounding
billing updated on the official page ($14/1,000 queries for Gemini 3
models — unused in every option). OpenAI: nine areas re-verified;
pricing unchanged for our short-context workload. Residual UNKNOWNs
after this pass: Gemini ZDR request mechanism; Gemini abuse-log
retention duration; Gemini explicit-cache default TTL; OpenAI Chat
`store` default; OpenAI help-center budget confirmation; OpenAI org
ID-verification requirement; subprocessor list contents (all three).
CI cannot establish current provider truth from the internet — every
external fact here requires human re-verification at ratification time
if more than ~60 days have passed (RISK-DECAY-01).
