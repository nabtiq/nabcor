# NABCor Foundation — v1.0 → v1.1 Change Ledger (BC-001 integration)

**Date:** 2026-07-17
**v1.0 =** the de-facto foundation set (`README.md` + `prompts/01…08` + `docs/*`,
ADRs 001–007). No single v1.0 Master Prompt file existed.
**v1.1 =** `NABCOR_FOUNDATION_MASTER_PROMPT_v1.1_BC001.md` — the first consolidated,
executable Foundation Master Prompt, integrating the accepted BC-001 findings.
**Inputs:** `JOSOUR_RETROSPECTIVE_REPORT.md` + `retrospective/*` @ `retrospective/bc-001`
(`4b06c2e`). Amendment source: `retrospective/FOUNDATION_PROMPT_AMENDMENTS.md` (A1–A16).
**Lesson-level dispositions:** `retrospective/BC001_ACCEPTANCE_LEDGER.md`.

Evidence classes used throughout:
`VALIDATED_BC001 · SUPPORTED_BC001 · HYPOTHESIS_FOR_EXPERIMENT · PROJECT_SPECIFIC · INSUFFICIENT_EVIDENCE`

---

## Part A — Amendment dispositions (A1–A16)

**Tally: Accepted 11 · Modified 4 (A5, A8, A14, A16) · Deferred 0 · Rejected 0.**
(A15 and A16 are acceptances of "change nothing" and "defer channels" respectively.)

```yaml
- amendment_id: A1
  retrospective_recommendation: "Add fourth invariant: decisions are artifacts — typed, versioned, never only chat/prose"
  evidence_classification: VALIDATED_BC001 (the contract practice — L03) / SUPPORTED_BC001 (the typed form — untested)
  accepted: true
  reason: "THEME/ASSETS/DECISIONS.md carried three rounds without drift; the failures (F10 stale email, unsettled spelling) map to facts NOT captured in a contract"
  target_foundation_section: "v1.1 §3 invariant I4"
  exact_change: "Invariant I4 with dual-form rule: machine-readable artifact is source of truth; human-readable rendering derived; conflict resolves to machine-readable; prose-only decisions are unratified"
  new_validation: "schema validity of every typed artifact (deterministic, BLOCKING)"
  new_contract: "contracts/decision.schema.json (§6.1)"
  new_risk: "artifact bureaucracy slows small rounds; mitigated by slice-1-only artifact set and second-wave-when-needed rule"

- amendment_id: A2
  retrospective_recommendation: "Add the decision-layer artifacts to the domain model (brand-context, claim-ledger, assumption-ledger, visual-world, design-system, image-direction, motion-spec, deployment-checklist)"
  evidence_classification: SUPPORTED_BC001 (each artifact traced to specific evidence; JSON shapes untested)
  accepted: true
  reason: "every artifact justified by a named failure or validated prose ancestor (NABCOR_ARTIFACT_EXTRACTION)"
  target_foundation_section: "v1.1 §4 artifact registry"
  exact_change: "slice-1 ★ set mandatory before the first vertical slice; second-wave contracts authored when first needed, not speculatively"
  new_validation: "artifact lineage completeness (ADVISORY until BC-002 validates, then BLOCKING)"
  new_contract: "artifact-lifecycle fragment (§4/§12.7); per-artifact schemas in slice-1 set"
  new_risk: "over-typing decisions that were cheap as prose; measured on BC-002 via revision-cost metric"

- amendment_id: A3
  retrospective_recommendation: "content gains provenance: every fact references a source-manifest entry; contact facts only from brand-context"
  evidence_classification: VALIDATED_BC001 (F10 — a stale contact fact shipped)
  accepted: true
  reason: "the near-miss class in BC-001 was stale facts, not invented ones; provenance closes it mechanically"
  target_foundation_section: "v1.1 §3 I6, §5 (stage 02 binding), §8 G4"
  exact_change: "content-map.json provenance half + G4 claim-ledger scan of built output"
  new_validation: "G4 deterministic scan BLOCKING; model paraphrase check ADVISORY"
  new_contract: "claim-ledger.json + content-map.json (slice-1 set)"
  new_risk: "ledger friction on fast copy edits; deterministic scan kept cheap (string/entity match)"

- amendment_id: A4
  retrospective_recommendation: "Prompt 07 gains four mandatory gates: JS-disabled render, AR animation screenshots, theme×locale×viewport matrix, claim-ledger scan"
  evidence_classification: "G1 VALIDATED_BC001 (F03) · G2 VALIDATED_BC001 (F09) · G3 SUPPORTED_BC001 (L10) · G4 VALIDATED_BC001 (F10 miss class)"
  accepted: true
  reason: "both user-facing incidents and the one shipped RTL defect are exactly these gate classes"
  target_foundation_section: "v1.1 §8 G1–G4; §5 stage-07 binding"
  exact_change: "G1/G2/G3 BLOCKING; G4 BLOCKING (deterministic) + ADVISORY (paraphrase)"
  new_validation: "the four gates themselves"
  new_contract: "contracts/validation-matrix.schema.json (§6.4)"
  new_risk: "matrix cost per round; mitigated by declared-subset matrix rather than full cross-product"

- amendment_id: A5
  retrospective_recommendation: "Token strategy section: prefer long cache-warm sessions; artifacts as canonical small reads; per-skill budgets; log from day 1"
  evidence_classification: "measurement mandate VALIDATED_BC001 (L02) · session strategy SUPPORTED_BC001 (L01) · artifacts-shrink-context HYPOTHESIS_FOR_EXPERIMENT (L14) · budget values HYPOTHESIS_FOR_EXPERIMENT"
  accepted: modified
  reason: "accepted, but the artifact-context-reduction claim and all budget numbers are explicitly labeled hypotheses; added the rule that caching is not a substitute for context minimization (task §3.2)"
  target_foundation_section: "v1.1 §7 + §6.5/§6.6 + I12"
  exact_change: "context/cache governance section with measured/hypothesis split; context manifest + budget contracts"
  new_validation: "token-budget compliance (breach pauses work); anomaly alert at 3× hourly median"
  new_contract: "contracts/context-manifest.schema.json + contracts/token-budget.schema.json"
  new_risk: "budget values wrong in either direction on first use; treated as experiment inputs, tuned on BC-002"

- amendment_id: A6
  retrospective_recommendation: "One orchestrating context invoking skills; no agent-per-skill; multi-workspace writes need a fetch/sync gate"
  evidence_classification: "single-orchestrator SUPPORTED_BC001 (L01 — one project, alternative untested) · sync gate VALIDATED_BC001 (F08)"
  accepted: true
  reason: "the evidence shows artifacts+phases were the lever, not agent count; task §3.3 requires measured justification before any new agent role — encoded as such"
  target_foundation_section: "v1.1 §3 I10 + §9"
  exact_change: "I10: no new autonomous agent role without a written, measured bottleneck; F08 sync gate in deployment-readiness vcs_sync"
  new_validation: "vcs_sync fields in G5 pre-flight"
  new_contract: "part of deployment-readiness (§6.3)"
  new_risk: "under-parallelization if a real bottleneck is ignored; escape hatch is the measured-justification path, not prohibition"

- amendment_id: A7
  retrospective_recommendation: "Screenshot review at composition milestones; contact-sheet approval mandatory before generated assets enter production"
  evidence_classification: SUPPORTED_BC001 (L10 probable; contact sheets worked every time used)
  accepted: true
  reason: "the workhorse gate of every accepted round; the one defect that shipped (F09) had skipped the capture set"
  target_foundation_section: "v1.1 §8 G6 (BLOCKING) + G7 (ADVISORY)"
  exact_change: "G6 contact-sheet gate BLOCKING; milestone reviews ADVISORY (cost/benefit unproven as mandatory)"
  new_validation: "G6, G7"
  new_contract: "none (uses evaluation-report artifact when authored)"
  new_risk: "review fatigue; ADVISORY status for milestones keeps the mandatory surface small"

- amendment_id: A8
  retrospective_recommendation: "Elevate Arabic-first into the constitution: AR default; text-splitting features ship only with AR captures; logical properties; dir-scoped CSS"
  evidence_classification: "AR gate VALIDATED_BC001 (F09) · AR-as-default-for-every-project SUPPORTED_BC001 (posture, one market observed)"
  accepted: modified
  reason: "gates and CSS rules accepted verbatim; 'AR is the default experience' softened to first-class-default posture with defaultLocale remaining a per-client content decision — nabcor already serves clients whose default may differ"
  target_foundation_section: "v1.1 §3 I7 + §8 G2"
  exact_change: "I7 wording; G2 BLOCKING"
  new_validation: "G2"
  new_contract: "none"
  new_risk: "none material — the modification only avoids over-generalizing one client's locale policy"

- amendment_id: A9
  retrospective_recommendation: "Intake writes manifest entries incl. has_alpha/vector_available/training_use; extract vector/transparent masters at intake; generated assets always labeled; client photos never regenerated"
  evidence_classification: "alpha/vector VALIDATED_BC001 (F04) · rights fields SUPPORTED_BC001 (policy-driven) · labeling/no-regeneration VALIDATED_BC001 as held discipline"
  accepted: true
  reason: "the light-mode logo defect existed because the vector master sat unextracted in the client PDF for 7 days"
  target_foundation_section: "v1.1 §6.2 + §5 stage-01/03/04 bindings + I11"
  exact_change: "asset provenance contract with intake-mandatory fields incl. rights defaults (benchmark/training default-deny)"
  new_validation: "asset-rights completeness (deterministic, BLOCKING)"
  new_contract: "contracts/asset-provenance.schema.json"
  new_risk: "intake slows slightly per asset; fields are mostly deterministic to fill"

- amendment_id: A10
  retrospective_recommendation: "Prompt 08 gains fetch/divergence pre-flight, DNS assertions, CI-outage retry class, post-deploy smoke matrix"
  evidence_classification: VALIDATED_BC001 (F01, F02, F08 all measured deploy-process failures)
  accepted: true
  reason: "all three deploy incidents were process gaps a pre-flight record turns into pre-flight failures"
  target_foundation_section: "v1.1 §6.3 + §8 G5"
  exact_change: "deployment-readiness contract covering build/env/assets/DNS/hosting/preview/rollback/smoke/post-verify (task §3.7 superset)"
  new_validation: "G5 BLOCKING"
  new_contract: "contracts/deployment-readiness.schema.json"
  new_risk: "checklist theater if filled after the fact; record is an artifact with lifecycle, so backfilling is visible"

- amendment_id: A11
  retrospective_recommendation: "Enumerate the five mandatory human gates; everything else autonomous-with-evidence"
  evidence_classification: VALIDATED_BC001 (every observed quality jump traces to a human gate)
  accepted: true
  reason: "HUMAN_AI_CONTRIBUTION_MAP: automate the checks, keep the gates"
  target_foundation_section: "v1.1 §3 I8 + §10 human evaluators"
  exact_change: "I8 lists the five; automation of final aesthetic acceptance and client communication is prohibited"
  new_validation: "human evaluators BLOCKING at their gates"
  new_contract: "decision records capture the human at the gate (decided_by)"
  new_risk: "gate latency; bounded by keeping the mandatory list at five"

- amendment_id: A12
  retrospective_recommendation: "Adopt NABCOR_OBSERVABILITY_REQUIREMENTS.md wholesale as the logging contract"
  evidence_classification: "the measurement gaps are MEASURED · the schema is SUPPORTED_BC001 (designed from the gaps, unexercised)"
  accepted: true
  reason: "BC-001's accounting required a custom transcript miner; every 'couldn't measure' becomes a logged field"
  target_foundation_section: "v1.1 §3 I9 + §6.7"
  exact_change: "run-record contract = observability doc + session_id + attribution_confidence (task §3.9)"
  new_validation: "observability records required for every run in the slice"
  new_contract: "contracts/run-record.schema.json"
  new_risk: "logging overhead; records are cheap JSONL appends, payload sampling capped per the doc"

- amendment_id: A13
  retrospective_recommendation: "Register BC-001's data/ set as the first benchmark inputs; client assets excluded per provenance"
  evidence_classification: VALIDATED_BC001 (the dataset exists and is measured)
  accepted: true
  reason: "first empirical baseline; rights boundaries already documented"
  target_foundation_section: "v1.1 §12.11 + §13"
  exact_change: "benchmarks/BC-001.md pointer with I11 rights constraints"
  new_validation: "none"
  new_contract: "none"
  new_risk: "single-case anchoring — mitigated by 'anchors, not targets' framing in §13"

- amendment_id: A14
  retrospective_recommendation: "Per-theme token tables (light+dark) and reveal-safety as theme acceptance criteria"
  evidence_classification: "per-theme token structure VALIDATED_BC001 (33-file retrofit sweep measured) · reveal-safety VALIDATED_BC001 (F03) · light+dark-for-every-theme PROJECT_SPECIFIC"
  accepted: modified
  reason: "the token *structure* must support multiple theme value-sets from day 1 and reveal-safety is an acceptance criterion; shipping two themes is per-client scope, not a foundation rule — BC-001 needed two because the client asked"
  target_foundation_section: "v1.1 §5 stage-06 binding + I5"
  exact_change: "theme acceptance = per-theme token completeness for the themes the project declares + I5 pattern"
  new_validation: "covered by G1/G3 and typecheck"
  new_contract: "design-system.json (slice-1 set)"
  new_risk: "none material"

- amendment_id: A15
  retrospective_recommendation: "Remove nothing — no existing prompt content contradicted BC-001"
  evidence_classification: VALIDATED_BC001 (checked against the full failure ledger)
  accepted: true
  reason: "the 8-step pipeline shape, three-layer model, and worked example stand; v1.1 §5 binds rather than rewrites"
  target_foundation_section: "v1.1 §5 preamble + §12.8"
  exact_change: "pipeline docs get smallest-edit bindings, no rewrites"
  new_validation: "none"
  new_contract: "none"
  new_risk: "none"

- amendment_id: A16
  retrospective_recommendation: "Defer multi-channel (campaigns/social) rules — BC-001 has no evidence about non-website channels"
  evidence_classification: INSUFFICIENT_EVIDENCE (for channel-specific foundation rules)
  accepted: modified
  reason: "deferral accepted for *rules*; the planned first slice already contains three social asset SPECIFICATIONS — kept (product vision preserved) but explicitly labeled EXPERIMENTAL, running under generic artifact/gate/budget rules, introducing no channel invariants"
  target_foundation_section: "v1.1 §11 (slice) + §10 cross-channel coherence EXPERIMENTAL"
  exact_change: "social step retained as spec-only + experimental; no channel-specific contracts authored in the foundation phase"
  new_validation: "cross-channel coherence evaluator marked EXPERIMENTAL"
  new_contract: "none"
  new_risk: "slice produces channel specs with no empirical quality bar; contained by spec-only scope"
```

---

## Part B — Material changes (change ledger)

### B.1 Empirically validated changes (VALIDATED_BC001)

```yaml
- change_id: C01
  source: A1/A4 (F03, L06)
  evidence_classification: VALIDATED_BC001
  original_rule: "v1.0 prompts treat animation/reveal behavior as theme implementation detail; no JS-off requirement anywhere"
  new_rule: "I5: core content renders with JS disabled; hiding only as proven enhancement with pure-CSS rescue; G1 BLOCKING"
  reason: "F03 — the only user-facing reliability incident: content invisible to real users for ~4 days because hiding was the default"
  expected_benefit: "the F03 failure class cannot ship"
  risk: "constrains some animation techniques; the BC-001 fix architecture proves the constraint is buildable"
  validation_needed: "seeded enhancer-failure test red-lines a violating build (BC-002)"

- change_id: C02
  source: A4/A8 (F09)
  evidence_classification: VALIDATED_BC001
  original_rule: "v1.0: RTL is mandatory in themes (build-a-theme.md) but no Arabic-specific animation review exists"
  new_rule: "G2 BLOCKING: Arabic screenshots of every text-splitting/per-word animation reviewed before ship; I7 logical-properties + dir-scoped CSS"
  reason: "F09 — Arabic words visually joined in the hero animation; the defect class only an Arabic-aware review catches"
  expected_benefit: "RTL typography defects caught pre-ship"
  risk: "capture overhead per animated feature; small and bounded"
  validation_needed: "AR-seeded defect caught in the matrix on BC-002"

- change_id: C03
  source: A9 (F04, L07)
  evidence_classification: VALIDATED_BC001 (alpha/vector) / SUPPORTED_BC001 (rights fields)
  original_rule: "v1.0 prompt 03 records dimensions/format/duplicates; no alpha/vector/rights capture; masters extracted on demand"
  new_rule: "§6.2 asset provenance contract intake-mandatory; vector/transparent masters extracted at intake; benchmark/training rights default-deny"
  reason: "F04 — light-mode logo defect existed because the client PDF's vector master was never extracted; rights boundaries from ASSET_PROVENANCE"
  expected_benefit: "no asset-class defect discovered at round N that intake data would have caught at day 1; rights violations structurally prevented"
  risk: "slightly slower intake"
  validation_needed: "BC-002 intake produces complete manifests with zero later master-extraction events"

- change_id: C04
  source: A10 (F01, F02, F08)
  evidence_classification: VALIDATED_BC001
  original_rule: "v1.0 prompt 08: fill templates, push, verify 5 URLs; no DNS assertions, no fetch gate, no outage class, no rollback record"
  new_rule: "§6.3 deployment-readiness contract + G5 BLOCKING pre-flight (build/env/assets/DNS/hosting/vcs-sync/preview/rollback/smoke/post-verify; CI outage = retry class)"
  reason: "all three deploy incidents (outage handling, DNS round-robin to parking IP, stale-base push) were process gaps"
  expected_benefit: "cutover and push failures become pre-flight failures"
  risk: "checklist theater; lifecycle-tracked record keeps backfilling visible"
  validation_needed: "zero deploy-process incidents on the next real migration"

- change_id: C05
  source: A3 (F10, L05)
  evidence_classification: VALIDATED_BC001
  original_rule: "v1.0: anti-fabrication by prompt discipline ('never invent'); no provenance mechanism; no output scan"
  new_rule: "I6 + claim-ledger/content-map artifacts + G4 scan of built output (deterministic BLOCKING, paraphrase ADVISORY)"
  reason: "the near-miss class was stale facts (F10 wrong email shipped); discipline held for invention but is unverifiable at scale"
  expected_benefit: "same integrity, mechanically enforced; stale-fact class closed"
  risk: "ledger maintenance cost"
  validation_needed: "seeded fabrication and seeded stale fact both caught in CI on BC-002"

- change_id: C06
  source: A11 (HUMAN_AI map)
  evidence_classification: VALIDATED_BC001
  original_rule: "v1.0: human involvement implicit in prompt wording ('stop and ask'); not enumerated"
  new_rule: "I8: five mandatory human gates; automation of final aesthetic acceptance and client communication prohibited"
  reason: "every observed quality jump traces to a human gate; two explicit REJECTs in skill extraction"
  expected_benefit: "gates preserved as the system scales; no silent automation creep"
  risk: "gate latency"
  validation_needed: "BC-002 records a human decision artifact at each of the five"

- change_id: C07
  source: A13 + §3.9 (L08)
  evidence_classification: VALIDATED_BC001
  original_rule: "v1.0: no attribution concept; no baseline datasets"
  new_rule: "I13 attribution boundaries (project/workspace/brand/workflow/session/run + confidence); BC-001 registered as first baseline with rights constraints"
  reason: "an unrelated same-directory session would have inflated measured output ~12% under naive attribution"
  expected_benefit: "cost and quality comparisons across cases are trustworthy"
  risk: "none material"
  validation_needed: "BC-002 retrospective requires zero attribution forensics"
```

### B.2 Supported architectural changes (SUPPORTED_BC001)

```yaml
- change_id: C08
  source: A1/A2 (L03)
  evidence_classification: SUPPORTED_BC001
  original_rule: "v1.0: decisions live in prose docs and prompts; content.ts is the only typed artifact"
  new_rule: "I4 decisions-are-artifacts + §4 registry (slice-1 ★ set) + §6.1 decision schema + dual-form/source-of-truth rules"
  reason: "prose contracts demonstrably prevented drift; typing adds queryability and machine checks — the typed form itself is unproven"
  expected_benefit: "later rounds cite artifact IDs instead of re-reading prose; fewer stale-fact escapes"
  risk: "over-typing; bureaucracy on small rounds"
  validation_needed: "BC-002: revision rounds re-enter at artifacts without re-derivation; discarded-output share < BC-001's 7%"

- change_id: C09
  source: A6 (L01, F08) + task §3.3
  evidence_classification: SUPPORTED_BC001
  original_rule: "v1.0: execution model unstated (prompts assume 'an AI assistant')"
  new_rule: "I10 single-orchestrator default; skills as callable capabilities; new agent roles require written measured justification; multi-workspace sync gate"
  reason: "one agent + artifacts + gates delivered BC-001; coordination overhead never justified by evidence"
  expected_benefit: "avoids swarm coordination cost and split-context drift"
  risk: "may under-parallelize at larger scale; escape hatch is measured justification, not prohibition"
  validation_needed: "compare only if a real bottleneck appears (per AS_BUILT_VS_NABCOR)"

- change_id: C10
  source: A5 (L01, L02) + task §3.2
  evidence_classification: SUPPORTED_BC001 (measurement mandate VALIDATED; strategies supported)
  original_rule: "v1.0: no token/context governance at all"
  new_rule: "§7 governance: all token classes measured; budgets + anomaly alerts (I12); session strategy; model tiering; 'caching is not a substitute for context minimization'"
  reason: "cache reads were 78% of BC-001's API-equivalent cost; waste was ~7% and would have been flagged live by the 3× alert"
  expected_benefit: "cost measurable by construction; dead-ends flagged in flight"
  risk: "budget values wrong on first use (they are hypotheses)"
  validation_needed: "BC-002 budgets tuned from measured per-skill actuals"

- change_id: C11
  source: A7 (L10)
  evidence_classification: SUPPORTED_BC001
  original_rule: "v1.0 prompt 07: gates are validate-content/build/a11y only; no visual review structure"
  new_rule: "G3 declared matrix BLOCKING; G6 contact-sheet BLOCKING; G7 milestone reviews ADVISORY"
  reason: "screenshot gates were the workhorse of every accepted round; the one skipped capture class shipped a defect"
  expected_benefit: "visual regressions and RTL defects caught pre-ship"
  risk: "review fatigue; contained by declared-subset matrix + ADVISORY milestones"
  validation_needed: "seeded visual regression caught on BC-002"

- change_id: C12
  source: A12 + task §5.1/§5.2
  evidence_classification: SUPPORTED_BC001
  original_rule: "v1.0: no logging, no run records, no context manifests"
  new_rule: "I9 observability-by-construction; §6.5–§6.7 contracts; slice requires records for every run"
  reason: "every BC-001 measurement gap becomes a logged field; forensics-free retrospectives"
  expected_benefit: "BC-002 retrospective is a query, not an archaeology project"
  risk: "schema churn as real usage exposes missing fields; versioned contracts absorb this"
  validation_needed: "BC-002 produces its token/survival numbers from records alone"
```

### B.3 Experimental metrics (EXPERIMENTAL until calculation validated)

```yaml
- change_id: C13
  source: task §3.10 (survival/rework numbers RECONSTRUCTED in BC-001)
  evidence_classification: HYPOTHESIS_FOR_EXPERIMENT
  original_rule: "v1.0: no lifecycle or survival concept"
  new_rule: "§4 lifecycle states (generated…published) + §10 experimental metrics: Production Survival Rate, Useful Token Yield, Cost per Accepted/Published Artifact, Discarded Token Ratio, Revision Cost"
  reason: "BC-001's ≈93% survival / ≈7% discard were bucket-level estimates; the metrics need by-construction data before they can be targets"
  expected_benefit: "waste visible per artifact instead of per forensic bucket"
  risk: "metric gaming or misreading if promoted to targets prematurely — explicitly forbidden until validated"
  validation_needed: "BC-002 computes them from run records; definitions adjusted where they mislead"
```

### B.4 Deferred ideas

```yaml
- change_id: C14
  source: A16
  evidence_classification: INSUFFICIENT_EVIDENCE
  decision: DEFERRED
  detail: "channel-specific (social/campaign) foundation rules and contracts; the slice's three social specs remain, spec-only and EXPERIMENTAL"

- change_id: C15
  source: skill extraction (EXPERIMENT tier)
  evidence_classification: HYPOTHESIS_FOR_EXPERIMENT
  decision: DEFERRED (to implementation-phase experiments, not foundation rules)
  detail: "generate-creative-territories (untested — BC-001 had a client reference), compose-cinematic-homepage (needs eval design + big budget), critique-genericity (taste automation unproven — G8 EXPERIMENTAL)"

- change_id: C16
  source: outputs/GAP-ANALYSIS.md (separate work stream, not BC-001)
  evidence_classification: out of BC-001 scope
  decision: DEFERRED (explicitly out of foundation-phase scope, v1.1 §12)
  detail: "multi-page routing / services-collection core architecture; in-flight working-tree changes in nabcor belong to that stream and were not touched"
```

### B.5 Rejected project-specific lessons (not generalized)

```yaml
- change_id: C17
  source: BC-001 creative record
  evidence_classification: PROJECT_SPECIFIC
  decision: REJECTED as foundation rules
  detail: "the dark-cinematic visual identity, film-chapter homepage composition, hexagon motif, specific motion values (900ms ease-out-quint, 80ms stagger, 25s Ken Burns) — the *pattern* generalizes only via visual-world contracts, never as defaults"

- change_id: C18
  source: BC-001 ops record
  evidence_classification: PROJECT_SPECIFIC
  decision: REJECTED as foundation rules
  detail: "domain-migration machinery (two-container cutover, 301 bridge, migration runbook), IPv4-only go-live decision, insulationbridges naming residue — one-time circumstances, not repeatable needs"

- change_id: C19
  source: A14 discussion
  evidence_classification: PROJECT_SPECIFIC
  decision: REJECTED as a universal rule (structure kept, quota rejected)
  detail: "'every theme ships light+dark' — BC-001 shipped two themes because the client asked; the foundation requires per-theme token *structure* from day 1, not a two-theme quota"

- change_id: C20
  source: skill extraction explicit_rejections
  evidence_classification: VALIDATED_BC001 (as rejections)
  decision: REJECTED (binding)
  detail: "one-agent-per-skill orchestration; automated final design approval"
```
