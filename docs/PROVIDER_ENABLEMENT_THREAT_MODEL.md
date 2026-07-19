# Provider Enablement Threat Model

**Status:** planning document for proposed DEC-0018 (Phase 1C.0). No
provider is enabled; DEC-0009 remains the active policy. This document
authorizes nothing — it is the threat analysis a future implementation
phase must satisfy before any provider adapter exists.

**Scope:** threats introduced by connecting NABCor's gateway to one real
LLM provider for synthetic-data EXP-0001 execution only. The offline
kernel's existing threat surfaces (store tampering, approval forgery,
namespace attacks) are covered by DEC-0012..DEC-0017 and their test
suites; this document covers what CHANGES when a network provider exists.

**Format:** every threat lists asset · attack/failure · preventive
control · detective control · response · residual risk · implementation
gate (what must exist, tested, before enablement) · decision owner.
"Owner: PO" means the Product Owner decides accepts/changes; "Owner:
impl" means the implementation phase must build it and prove it by test.

Severity legend: HIGH threats are those whose failure breaks a
constitution-level invariant (fabrication reaching truth, client data
leaving the boundary, unbounded spend); they gate enablement absolutely.

---

## 1. Credential and secret threats

### T01 — API-key leakage (HIGH)
- **Asset:** the provider API key; everything it can spend and send.
- **Attack/failure:** key committed to Git, embedded in an artifact or
  fixture, pasted into a PR, printed by a CLI, exfiltrated from a
  developer machine, or captured from shell history.
- **Preventive:** key lives only in the OS-level secret store
  (macOS Keychain locally; CI has NO provider key by default — see
  PROVIDER_ENABLEMENT_DECISION_PACKET §8); injected into the gateway
  process as an environment variable at spawn time only; never accepted
  as a command-line argument; never written to any artifact, manifest,
  model-run record, or log (existing rule: model-run records carry
  identifiers and token counts only). Scanning today: the repository-
  wide PEM-armor scan (no exemptions) plus provider-key-shape patterns
  on the packet documents are blocking; extending the provider-key-shape
  patterns repository-wide is part of this threat's implementation gate,
  not a present-tense claim.
- **Detective:** the existing no-exemption key/armor scan extended with
  provider key prefixes; provider console usage dashboard reviewed
  against local run records; anomaly = any spend without a matching
  model-run record.
- **Response:** revoke the key in the provider console (emergency
  disable path E1 below), rotate, audit run records vs provider usage
  export, record an incident learning.
- **Residual:** a compromised developer machine can read the Keychain
  entry while unlocked. Accepted for synthetic-only scope; production
  scope requires the managed secret service (packet §8).
- **Gate:** leakage-scan tests updated and green; key-injection path
  implemented with zero persistence; revocation drill documented.
- **Owner:** impl builds; PO accepts residual.

### T02 — Secret exposure in logs and error paths (HIGH)
- **Asset:** API key, request headers, provider error bodies.
- **Attack/failure:** provider SDK or HTTP error embeds the
  Authorization header or key fragment in an exception message that a
  run record, CLI output, or CI log persists.
- **Preventive:** the gateway redacts provider errors BEFORE any
  persistence (allowlist of fields kept: status code, provider request
  ID, typed error class); the existing CLI redaction (DEC-0017) stays;
  raw provider exceptions never cross the gateway boundary (typed
  failures only, the existing `KernelFailure` discipline).
- **Detective:** tests that inject synthetic armor/key-shaped strings
  into mocked provider errors and assert nothing credential-shaped
  reaches any output channel or stored record.
- **Response:** treat as T01 (rotate + audit).
- **Residual:** low — the redaction layer is deterministic and testable.
- **Gate:** redaction layer implemented with adversarial tests.
- **Owner:** impl.

### T03 — Unauthorized local configuration override (HIGH)
- **Asset:** the active gateway policy (which provider, models, classes,
  ceilings are allowed).
- **Attack/failure:** an operator, agent, or malicious process points
  the gateway at a modified policy file, an environment override, or a
  foreign trusted-config directory to bypass DEC-0009/DEC-0018 limits.
- **Preventive:** the gateway loads the active policy from a
  caller-fixed path (today the operator CLI pins the repository's
  committed path; the gateway itself takes the path at construction);
  policy content is CI-validated; no environment variable selects
  policy content; the implementation phase must additionally refuse
  non-repository policy sources outside test binaries; the
  provider adapter refuses to construct when the active policy pins the
  fake adapter (i.e., enabling requires the ratified policy revision to
  be committed and merged, not a local flag). Any test seam that loads
  an alternate policy must be refused outside test binaries.
- **Detective:** model-run records carry the policy id/version they ran
  under; a record naming an unknown policy version is an audit alarm;
  the repository validation compares the active policy against the
  ratified constants.
- **Response:** revoke key (E1), investigate the divergent records.
- **Residual:** a fully compromised host can bypass any local control —
  same boundary as DEC-0016's single-host assumption.
- **Gate:** policy-pinning tests (foreign policy refused) green.
- **Owner:** impl; PO accepts the host-trust boundary.

## 2. Data-flow threats

### T04 — Accidental client-data transmission (HIGH)
- **Asset:** real client material; NABCor's data-class promise
  (INV-DATA-001/002, DEC-0009).
- **Attack/failure:** a workspace containing real client artifacts is
  used in a provider-backed run; a synthetic fixture is contaminated
  with real content; an operator points the gateway at the wrong store.
- **Preventive:** the active policy's `allowed_data_classes` stays
  `["synthetic"]` in the proposed enablement; gateway requests already
  carry a data-class declaration validated before invocation; the
  provider phase adds a workspace allowlist (only explicitly named
  synthetic experiment workspaces may cross the adapter); real-client
  data-class remains structurally unapprovable without the frozen
  DEC-0008 independent-review gate PLUS a new ratified decision.
- **Detective:** context manifests record every artifact sent; manifest
  audit against the synthetic-workspace allowlist; spot review of
  EXP-0001 inputs (they are the committed benchmark fixtures).
- **Response:** halt runs (E1), identify what was sent, provider
  deletion request where supported, incident learning, PO review.
- **Residual:** human mislabeling of "synthetic" at fixture-creation
  time; mitigated by benchmark fixtures being repository-committed and
  reviewed.
- **Gate:** workspace-allowlist enforcement + data-class tests green.
- **Owner:** impl builds; PO owns the fixture-review discipline.

### T05 — Cross-brand context leakage (HIGH)
- **Asset:** brand isolation (INV-DATA-001).
- **Attack/failure:** a prompt assembled for brand A includes artifacts
  from brand B (bug in context assembly), or a provider-side cache mixes
  brand contexts.
- **Preventive:** context assembly reads through the brand-namespaced
  store only (existing boundary); manifests are per-request and
  brand-scoped; provider-side caching is disabled or scoped so cache
  keys never span brands (exact mechanism depends on the ratified
  provider's caching model; until proven, cross-request caching stays
  off).
- **Detective:** manifest validation — every artifact id in a request
  must belong to the request's brand namespace; a deterministic check,
  testable without a provider.
- **Response:** halt, audit manifests, fix assembly, re-run.
- **Residual:** provider-internal behavior is not observable; bounded by
  synthetic-only data in this phase.
- **Gate:** manifest brand-isolation check implemented and tested.
- **Owner:** impl.

### T06 — Prompt injection from untrusted captured content (HIGH)
- **Asset:** output integrity; the truth pipeline.
- **Attack/failure:** benchmark case BM-23-class content instructs the
  model to fabricate claims, exfiltrate context, or emit malicious
  output; quarantined content reaches a prompt.
- **Preventive:** quarantine remains fail-closed (DEC-0007/DEC-0008 —
  no runtime read path exists, unchanged by enablement); source content
  enters prompts as clearly-delimited data with the existing
  injection-scanner flags attached; system instructions assert
  data-not-instructions; model outputs land as UNVERIFIED artifacts that
  must pass deterministic contract validation and provenance rules
  before any claim exists (INV-FACT-001/002 — a fabricated "verified"
  status is contract-invalid without provenance).
- **Detective:** EXP-0001 explicitly measures injection handling
  (BM-23); fabricated-claim count metric (must be 0); deterministic G4
  claim audit.
- **Response:** experiment failure → redesign extraction prompting; no
  silent retry-past-it.
- **Residual:** injection can degrade output quality even when it cannot
  create authority; accepted — that is exactly what EXP-0001 measures.
- **Gate:** EXP-0001's injection case is part of the pass criteria.
- **Owner:** impl + evaluation.

### T07 — Provider data retention (HIGH)
- **Asset:** everything sent to the provider (synthetic-only in this
  phase); future client-data posture.
- **Attack/failure:** provider retains inputs/outputs (default or
  abuse-monitoring retention), creating a data copy outside NABCor's
  control; a later breach or legal process exposes it.
- **Preventive:** synthetic-only data class (nothing sensitive exists to
  retain in this phase); the ratified option records the provider's
  documented retention posture with sources — for Anthropic the
  conservative operative default is automatic backend deletion within
  30 days with listed exceptions (packet row 17, ledger C4);
  zero/configurable retention is pursued per the packet matrix before
  any real-data decision (taxonomy in T07a); provider-side storage
  features (files, stored conversations, provider memory) stay unused
  and disabled.
- **Detective:** periodic re-verification of the provider's published
  retention policy (packet sources carry access dates; re-check at each
  phase boundary — RISK register entry).
- **Response:** if the provider's retention posture worsens, emergency
  disable (E1) and PO re-decision.
- **Residual:** provider compliance with its own policy is contractual
  trust, not observable. Bounded by synthetic-only scope.
- **Gate:** none beyond documentation in this phase; real-data scope
  requires contract-grade assurances (REQUIRES CONTRACT items in the
  packet).
- **Owner:** PO.

### T07a — Retention-taxonomy confusion and conditional-ZDR claims (HIGH) *(added by Phase 1C.0.1)*
- **Asset:** the truthfulness of every retention claim NABCor makes;
  the future real-client-data decision's evidence base.
- **Attack/failure:** conflating distinct retention layers — DEFAULT
  PROVIDER RETENTION (backend deletion windows), REQUEST-STATE STORAGE
  (stored responses/interactions/conversations), ABUSE-MONITORING LOGS,
  ZDR-APPROVED LOGGING BEHAVIOR (e.g., Gemini's sanitize-before-write),
  FILES-API STORAGE, EXPLICIT CACHE STORAGE, IMPLICIT IN-MEMORY
  CACHING, GROUNDING RETENTION, and PROVIDER-SIDE CONVERSATION STATE —
  and then claiming a stronger posture than is configured (the exact
  error class Phase 1C.0.1 corrected: "no ZDR offering" was false for
  Gemini; "stateless" was readable as zero retention for Anthropic).
- **Preventive:** the packet's corrected matrix rows 17/18/24 and the
  correction ledger define the taxonomy; the packet validator fails on
  the prohibited conflations (stateless=zero-retention,
  no-training=no-retention, store=false=ZDR, Gemini-has-no-ZDR); every
  future policy candidate must name which layer each retention claim
  addresses.
- **Detective:** validator sentinels in CI; re-verification rule at
  ratification (RISK-DECAY-01).
- **Response:** ledger entry + correction phase (this document is the
  template).
- **Residual:** CI cannot verify provider truth from the internet —
  external facts require human re-verification.
- **Gate — Gemini-specific, binding IF Gemini is ever the selected
  provider:** the implementation must enforce, with tests, ALL of:
  `store=false` on every request; no Google Search grounding; no Maps
  grounding; no Files API use; no explicit `cached_content`; no Live
  API session resumption; no tools; AND must report the literal status
  `ZDR_NOT_VERIFIED` in status/run surfaces until a project ZDR
  approval is EVIDENCED (approval artifact recorded) — configuring
  `store=false` alone must never surface as a ZDR claim.
  **Anthropic-specific:** all surfaces describe normal API retention
  conservatively as "up to 30 days (automatic backend deletion)" unless
  a ZDR agreement is evidenced; "no request-state storage" is never
  rendered as a retention claim.
- **Owner:** impl builds the gates; PO owns any ZDR claim.

### T08 — Cache privacy (MEDIUM)
- **Asset:** prompt-cache contents at the provider.
- **Attack/failure:** cached prefixes persist provider-side beyond the
  request; cache keys or contents leak across NABCor workspaces or (in
  a provider defect) across customers.
- **Preventive:** caching is enabled only if the ratified provider
  documents cache isolation and TTL; cache use starts disabled in
  EXP-0001 unless the cost model justifies it; synthetic-only data.
- **Detective:** cost/usage reports show cache hits; unexpected cache
  behavior is visible in token accounting.
- **Response:** disable caching (config, no code change), continue.
- **Residual:** provider-internal; bounded by synthetic data.
- **Gate:** caching defaults to off unless explicitly ratified in the
  option.
- **Owner:** PO (via the ratified option's caching stance).

## 3. Provider-behavior threats

### T09 — Provider/model substitution (HIGH)
- **Asset:** the guarantee that only ratified models run.
- **Attack/failure:** a config edit, alias drift, or provider-side
  routing serves a different model than ratified; a "latest" alias
  silently upgrades.
- **Preventive:** the future policy revision pins EXACT dated model IDs
  (no `latest` aliases); the adapter sends only pinned IDs and
  validates the model echoed in the provider response against the
  request; any mismatch is a typed failure that writes a truthful run
  record and stops.
- **Detective:** model-run records store the response's reported model
  string; validation compares it to the allowlist.
- **Response:** halt runs, PO decision on the replacement ID (a policy
  revision, never a silent update).
- **Residual:** a provider misreporting its own model id is
  undetectable; low likelihood, accepted.
- **Gate:** response-model validation tested against mocked mismatches.
- **Owner:** impl; PO ratifies every model-ID change.

### T10 — Model-version drift / deprecation (MEDIUM)
- **Asset:** reproducibility of EXP-0001 evidence.
- **Attack/failure:** the pinned model is deprecated mid-experiment or
  behaves differently across provider-side updates.
- **Preventive:** pin dated snapshots where the provider offers them;
  record deprecation windows from official lifecycle docs in the packet;
  schedule experiments within one window.
- **Detective:** provider deprecation announcements (packet sources);
  run records carry model IDs so affected evidence is identifiable.
- **Response:** re-ratify a replacement ID; mark affected evidence with
  the model change; never mix model versions inside one experiment run
  without recording it.
- **Residual:** provider-side silent quality drift within one ID.
- **Gate:** model IDs in the ratified option must carry the provider's
  documented lifecycle status.
- **Owner:** PO.

### T11 — Schema-valid fabrication (HIGH)
- **Asset:** truth integrity (INV-FACT-001/002).
- **Attack/failure:** the model returns contract-valid claims whose
  content is invented — the exact BC-001 fabrication class EXP-0001
  exists to measure.
- **Preventive:** structured output is necessary but NEVER sufficient:
  every model-produced claim enters as `unconfirmed`/`inference` with
  mandatory provenance (source refs resolved against the store);
  factual claims without resolvable fragments are contract-invalid; the
  deterministic G4 audit runs on every package; models cannot set
  verification status (the analyzer/human-gate boundaries are
  unchanged).
- **Detective:** EXP-0001 fabricated-claim count (hard fail at 1) and
  seeded-fact recall metrics; deterministic claim audit.
- **Response:** hard experiment failure; redesign before rerun.
- **Residual:** fabrication in free-text fields that cite real fragments
  loosely; measured by human review in EXP-0001.
- **Gate:** the claim-provenance validation path exercised in tests
  before any provider call.
- **Owner:** evaluation; PO on pass/fail.

### T12 — Model output treated as verified truth (HIGH)
- **Asset:** the human-gate boundary (INV-HUM-001).
- **Attack/failure:** a pipeline change lets model output set
  `verified`, resolve contradictions, or satisfy approvals.
- **Preventive:** structurally unchanged boundaries: verification
  status upgrades require human paths (INV-FACT-002); contradiction
  resolution requires the DEC-0016 signed-decision loop; approvals
  require DEC-0014 evidence. The provider phase adds NO write path from
  model output to any of these.
- **Detective:** existing semantic checks (inference-verified-needs-
  human) and resolution suites remain blocking.
- **Response:** any such path found is a defect reopening DEC-0016/17.
- **Residual:** none identified beyond implementation error, which the
  existing suites detect.
- **Gate:** existing suites stay green with the adapter present.
- **Owner:** impl.

### T13 — Malicious or malformed provider responses (MEDIUM)
- **Asset:** gateway integrity; downstream stores.
- **Attack/failure:** oversized bodies, invalid JSON, control
  characters, injection-shaped content in "structured" fields, wrong
  content types.
- **Preventive:** responses are `unknown` until contract-validated
  (existing discipline); size caps before parsing; structured-output
  validation failures are typed, bounded-retry events, never partial
  writes; no response content is ever executed or path-interpolated.
- **Detective:** validation-failure counts in run records.
- **Response:** bounded retry (see T14), then typed failure to the
  operator.
- **Residual:** low.
- **Gate:** adversarial response-mock tests.
- **Owner:** impl.

## 4. Availability and cost threats

### T14 — Retry storms (HIGH)
- **Asset:** spend ceilings; provider standing.
- **Attack/failure:** timeout/5xx loops, validation-failure loops, or
  concurrent runs multiply requests unboundedly.
- **Preventive:** hard `max_attempts` per request (proposed: 2 total,
  i.e., one retry) enforced in the adapter; retries never bypass budget
  metering (each attempt spends budget); no automatic escalation
  (escalation consumes the budgeted reserve exactly once and only on
  typed failure per MODEL_AND_TOKEN_STRATEGY §2); exponential backoff
  with a ceiling; single-writer experiment execution (one run at a
  time, the DEC-0016 boundary).
- **Detective:** run records per attempt; attempts-per-request metric;
  budget breach pauses work and pings the human (existing budget rule).
- **Response:** breach → pause + PO ping (never silent continuation).
- **Residual:** none material with hard attempt caps.
- **Gate:** attempt-cap and budget-metering tests green.
- **Owner:** impl.

### T15 — Runaway cost (HIGH)
- **Asset:** money; the zero-surprise-spend promise.
- **Attack/failure:** a loop, oversized context, or mispriced
  assumption spends far past the estimate; a leaked key spends
  externally (T01).
- **Preventive:** layered ceilings (per-request, per-run, daily,
  monthly — packet §6) enforced pre-invocation from metered token
  counts; provider-console hard spend cap set to the monthly ceiling
  where the provider supports it (packet matrix records whether it
  does); EXP-0001 is the only approved workload.
- **Detective:** metering vs provider usage dashboard reconciliation
  after every experiment session; the anomaly alert (hourly output >
  3× median, MODEL_AND_TOKEN_STRATEGY §5).
- **Response:** emergency disable E1; reconcile; incident learning.
- **Residual:** provider-side billing lag can delay detection by hours;
  bounded by the console cap where available.
- **Gate:** ceiling enforcement tested with mocked meters.
- **Owner:** impl; PO sets ceiling values.

### T16 — Provider outage / network timeouts / partial records (MEDIUM)
- **Asset:** experiment integrity; record truthfulness.
- **Attack/failure:** a request times out after tokens were consumed; a
  run record would be missing or wrong; an experiment half-completes.
- **Preventive:** every attempt writes its run record with what is KNOWN
  (request sent, response absent → typed timeout outcome; token counts
  only when reported); records are written before results are consumed
  (existing manifest-before-call rule extends to record-after-response);
  experiments resume case-by-case (cases are independent).
- **Detective:** records with timeout outcomes; reconciliation against
  the provider usage dashboard for unreported consumption.
- **Response:** resume remaining cases; count unknown-consumption
  against the daily ceiling conservatively.
- **Residual:** exact token counts for abandoned requests may be
  unknowable; accounted conservatively.
- **Gate:** timeout-path tests with mocked transport.
- **Owner:** impl.

### T17 — Provider account suspension (LOW)
- **Asset:** experiment schedule.
- **Attack/failure:** the account is flagged/suspended (false-positive
  abuse detection, billing failure).
- **Preventive:** synthetic benign workload; accurate account data;
  prepaid/limited billing where offered.
- **Detective:** provider console/status notifications.
- **Response:** provider support; experiments pause (nothing else in
  NABCor depends on the provider).
- **Residual:** schedule risk only.
- **Gate:** none required before enablement (LOW severity; the response
  path needs no build).
- **Owner:** PO.

### T18 — Billing anomaly (MEDIUM)
- **Asset:** money; trust in accounting.
- **Attack/failure:** provider-side billing error, double-charging, or
  unexplained usage divergence from run records.
- **Preventive:** run-record metering is authoritative for NABCor's own
  view; console caps bound the blast radius.
- **Detective:** per-session reconciliation (records vs provider usage
  export); divergence beyond tolerance is an incident.
- **Response:** halt (E1), dispute with provider evidence, learning.
- **Residual:** small unexplained divergences (token-counting
  differences); tolerance documented in the cost model.
- **Gate:** the reconciliation procedure (records vs usage export)
  documented and drilled once on the initial smoke call before
  EXP-0001.
- **Owner:** PO.

## 5. Supply-chain and boundary threats

### T19 — Compromised dependency / supply chain (HIGH)
- **Asset:** the entire runtime (a malicious package can read secrets
  and data).
- **Attack/failure:** the provider SDK or a transitive dependency ships
  malicious code; typosquatting; postinstall scripts.
- **Preventive:** the dependency boundary stays minimal — the packet
  recommends raw HTTPS via Node built-in `fetch` where the provider
  documents it, ZERO new runtime dependencies preferred; if an SDK is
  ratified instead, exact-version pinning (the repo already pins exact
  versions, no ranges), lockfile-only installs (`npm ci`), and the
  production-install smoke test extend to it; `npm audit` stays
  blocking; no postinstall scripts tolerated.
- **Detective:** dependency-boundary test (the allowlist of runtime
  deps) fails on any addition; audit in CI.
- **Response:** remove/pin-back, rotate key (assume exposure), incident
  learning.
- **Residual:** npm registry compromise window before advisories;
  minimized by the zero-new-dependency preference.
- **Gate:** dependency-allowlist test updated ONLY by the ratified
  decision.
- **Owner:** PO ratifies any new dependency (AGENTS rule 3).

### T20 — Fallback bypass (MEDIUM)
- **Asset:** the single-ratified-provider guarantee.
- **Attack/failure:** convenience code adds a second provider or an
  aggregator "fallback" that routes around the ratified allowlist.
- **Preventive:** the policy allowlists exactly one adapter; the
  gateway refuses unknown adapters (existing DEC-0010 behavior); no
  fallback logic is ratified in the proposed option.
- **Detective:** provider-independence grep gate (no SDK/provider
  imports outside the gateway) plus adapter-allowlist tests.
- **Response:** revert; decision-record review.
- **Residual:** none with the grep + policy gates.
- **Gate:** existing provider-independence tests extended to the new
  adapter module.
- **Owner:** impl.

### T21 — Request/response logging beyond records (MEDIUM)
- **Asset:** data minimization; secrets (T02).
- **Attack/failure:** debug logging, crash dumps, or verbose SDK
  logging persist raw prompts/responses outside the canonical record
  store.
- **Preventive:** no debug logging of bodies in the adapter; SDK
  verbose/debug modes off (or no SDK); run records store references and
  counts, never raw transcripts (existing INV-TOK-002 discipline).
- **Detective:** leakage tests assert no body content appears in
  stdout/stderr or stored records during mocked runs.
- **Response:** purge, fix, learning.
- **Residual:** OS-level core dumps; accepted for synthetic scope.
- **Gate:** transcript-leakage tests.
- **Owner:** impl.

## 6. Emergency disable (E1) — required for any recommendation

A credible emergency-disable path must satisfy: effective within
minutes; not requiring a code deployment; verifiable afterward.

Proposed layered path (design, not implementation):

1. **Revoke the API key at the provider console** — immediate, total,
   independent of NABCor code. This is the primary kill switch and
   exists on day one for every candidate provider (the packet matrix
   records console capability per provider).
2. **Remove the key from the local secret store** — stops new process
   spawns from acquiring credentials.
3. **Repository-level disable** — revert the enabling policy revision
   (a commit, CI-validated); slower, durable, auditable.
4. **Provider-console spend cap at the monthly ceiling** — bounds the
   worst case even if 1–3 are delayed.

Detection feeding E1: budget-breach pause, reconciliation divergence,
leakage-scan failure, retention-policy change, any CONFIRMED security
finding. Decision owner for invoking E1: the Product Owner, or any
operator on a HIGH-threat trigger (revoke first, review after —
revocation is always safe).

## 7. Residual-risk summary for ratification

Accepting Option A (packet §10) accepts these residuals knowingly:
provider-internal behavior (retention compliance, cache internals,
model-id honesty) is contractual trust, not observable — bounded in
this phase by synthetic-only data and hard spend ceilings; host-level
compromise of the single operator machine defeats local controls —
unchanged from the existing single-host boundary (DEC-0016); npm
supply-chain risk is minimized (preferably zeroed) by the
no-new-runtime-dependency posture. Every HIGH threat above carries an
implementation gate that must be test-proven in the future
implementation phase BEFORE first paid request; merging this document
builds none of them and enables nothing.
