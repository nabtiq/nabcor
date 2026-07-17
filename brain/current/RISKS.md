# Risk Register

**Updated:** 2026-07-17
Material risks only. Review at every phase boundary.

| ID | Risk | Probability | Impact | Early signal | Primary mitigation | Owner role | Status |
|---|---|---:|---:|---|---|---|---|
| RISK-PROD-01 | Output is polished but generic. | medium | critical | humans cannot distinguish territories from template output | bounded diversity experiment, recorded rejection, calibrated evaluation | product owner | open |
| RISK-TRUST-01 | Fabricated claim or misleading generated asset reaches a client. | low–medium | critical | unbacked factual slots or provisional content loses its label | provenance contracts, deterministic claim gate, human approval | operator | open |
| RISK-EVAL-01 | Model judges create false numerical authority. | high | high | score/human preference disagreement | advisory status until calibrated; reasons and evidence mandatory | evaluation owner | open |
| RISK-SCOPE-01 | The clean repository accumulates channels and frameworks before the slice works. | high | high | new runtime/UI proposals without exit evidence | Constitution feature test, decision records, NON_GOALS | product owner | open |
| RISK-COST-01 | Token and cache spend grows without improving surviving artifacts. | medium | high | missing run records or frequent budget breaches | budgets, context manifests, survival metrics, EXP-0005 | operator | open |
| RISK-MEM-01 | Second Brain becomes stale documentation theatre. | medium | high | decisions remain in chat; NOW is outdated; learnings are not loaded | session bootstrap, structural validation, phase-boundary review | product owner | open |
| RISK-ARCH-01 | Schemas and consuming code drift. | medium | high | schema bump without migration/test changes | versioned contracts, negative fixtures, CI | architecture owner | open |
| RISK-DATA-01 | Client material crosses brands or enters evaluation/training without rights. | low–medium | critical | missing rights records or shared content namespaces | default-deny rights, per-brand isolation, provider approvals | operator | open |
| RISK-PROVIDER-01 | Product behavior couples to one provider/model. | medium | medium | skills import provider SDKs directly | provider-independent gateway and capability tiers | architecture owner | open |
| RISK-OPS-01 | Uncommitted or session-only work is lost. | medium | high | long work spans without canonical artifacts/commits | durable workspace, coherent checkpoints, append-only learning | operator | mitigated |
| RISK-INTEG-01 | Documentation or runtime claims exceed enforced behavior (packaging truth, quarantine, provenance, capture). Phase 1A shipped four such gaps, corrected by DEC-0006. | medium | high | a stated guarantee has no failing test; a "quarantine"/"captured"/"zero-dependency" claim without an enforcement path | every stated boundary carries a deterministic test that fails without it (production-install smoke, quarantine retrieval denial, canonical-reference rejection); corrections are appended decisions, never silent rewrites | architecture owner | mitigated |
