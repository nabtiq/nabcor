# Risk Register

> Material risks only. Each: probability · impact · early signal · mitigation ·
> owner role · status. Reviewed at every phase boundary; stale rows are a defect.

**Updated:** 2026-07-17

## Product

```yaml
- id: RISK-PROD-01
  risk: Slice outputs are competent but generic — the distinctiveness thesis fails
  probability: medium
  impact: critical (Constitution §13.1)
  early_signal: EXP-0002 diversity scores clustered; blind reviewers cannot tell NABCor territory sets from template output
  mitigation: territory diversity constraints + critique pass; G8 genericity evaluator; human taste gates kept mandatory
  owner: product owner
  status: open

- id: RISK-PROD-02
  risk: Multi-channel demand is weaker than assumed; social specs add cost without value
  probability: medium
  impact: high (category thesis weakens — DEC-0001 revisit trigger)
  early_signal: clients ignore/discard social specs across several slice runs
  mitigation: slice keeps social spec-only and cheap; DEC-0001 revisit trigger defined
  owner: product owner
  status: open
```

## Architecture

```yaml
- id: RISK-ARCH-01
  risk: Two-layer product (creative OS + website core) drifts — specs stop compiling to what the channel layer can build
  probability: medium
  impact: high (Phase 4 bridge fails)
  early_signal: website-spec fields with no mapping to SiteContent; multi-page core work (Q-001) diverging from spec assumptions
  mitigation: DOMAIN_MODEL §9 mapping table maintained; Phase 4 bridge is an explicit phase with exit evidence; Q-001 resolution
  owner: architecture lead
  status: open

- id: RISK-ARCH-02
  risk: Contract churn — schemas change so often that artifacts and code disagree
  probability: medium
  impact: medium
  early_signal: schema_version bumps without migration notes; validation failures on previously-valid artifacts
  mitigation: versioned schemas; supersession rules (INV-VER-001); silent schema changes prohibited (AGENTS.md)
  owner: architecture lead
  status: open

- id: RISK-ARCH-03
  risk: Ephemeral working environments lose uncommitted foundation work
  probability: high (occurred during Phase 0 — scratchpad wipe lost a day's files before restoration)
  impact: medium (recoverable when content survives elsewhere; high if not)
  early_signal: worktrees or working dirs in temp/session-scoped paths; long gaps between commits
  mitigation: durable worktree locations only; commit checkpoints after every coherent batch (adopted mid-Phase-0)
  owner: architecture lead
  status: mitigated (standing rule)
```

## AI / model

```yaml
- id: RISK-AI-01
  risk: A fabricated claim or mislabeled generated asset ships to a real client
  probability: low-medium
  impact: critical (trust incident — Constitution §13.2)
  early_signal: G4 advisory paraphrase findings rising; provisional content reaching preview unlabeled
  mitigation: INV-FACT-001..003 layered enforcement; adversarial benchmark cases; human claim gate
  owner: operator (per project) + evaluation owner
  status: open

- id: RISK-AI-02
  risk: LLM-judge evaluators are miscalibrated — scores look precise, mean nothing
  probability: high
  impact: medium-high (false confidence gates quality)
  early_signal: judge scores disagree with blind human pairwise picks (EXP-0003 calibration check)
  mitigation: INV-EVAL-001 (reasons+evidence, advisory-until-calibrated); human evaluation stays in the loop; judges never sole authority
  owner: evaluation owner
  status: open

- id: RISK-AI-03
  risk: Provider dependency — a model deprecation/price change breaks routing or economics
  probability: medium
  impact: medium
  early_signal: any skill importing a provider SDK directly; one tier served by a single model with no fallback
  mitigation: INV-PROV-001 gateway; tier table names capability, config names models; routing policy reviewed per phase
  owner: architecture lead
  status: open
```

## Creative quality

```yaml
- id: RISK-CRE-01
  risk: Arabic quality regressions — the system optimizes for English and ships RTL/typography defects
  probability: medium
  impact: high (core market; INV-AR-001)
  early_signal: G2 captures skipped or rubber-stamped; benchmark Arabic-first cases scoring lower than English-first
  mitigation: G2 blocking gate; bilingual benchmark cases; native-reader review at human gates (BC-001 F09 lesson)
  owner: operator
  status: open
```

## Data

```yaml
- id: RISK-DATA-01
  risk: Client data leaks across brand boundaries (retrieval, benchmarks, or prompts)
  probability: low
  impact: critical
  early_signal: any cross-brand artifact reference; benchmark inputs without rights fields
  mitigation: INV-DATA-001/002; per-brand namespaces; rights default-deny; dataset intake gate
  owner: architecture lead
  status: open
```

## Cost

```yaml
- id: RISK-COST-01
  risk: Token spend grows silently (cache reads, retries, judge loops) until margins vanish
  probability: medium-high
  impact: high
  early_signal: budget breaches; anomaly alerts (3× hourly median); Discarded Token Ratio trending above BC-001's ~7% anchor
  mitigation: INV-TOK-001/002; INV-OBS-001 records all token classes; EXP-0005 establishes the slice baseline; escalation-only model routing
  owner: operator + product owner
  status: open
```

## Security

```yaml
- id: RISK-SEC-01
  risk: Prompt injection via uploaded client documents manipulates extraction or generation
  probability: medium
  impact: high
  early_signal: instruction-like text in sources without injection_flag; adversarial benchmark case failing
  mitigation: INV-SEC-002; source quarantine; adversarial dataset cases in every eval run
  owner: architecture lead
  status: open

- id: RISK-SEC-02
  risk: Secrets leak into prompts, transcripts, or artifacts
  probability: low-medium
  impact: critical
  early_signal: scanner findings; credentials appearing in run-record samples
  mitigation: INV-SEC-001; CI secrets scan (Phase 1); observability redaction policy
  owner: architecture lead
  status: open
```

## Business

```yaml
- id: RISK-BUS-01
  risk: Foundation discipline slows delivery below the ≥50% improvement target, undermining the business case
  probability: medium
  impact: high
  early_signal: Phase 4 BC-002 measurement misses the ≤~20–30 working-hour target (delivery-baseline.md)
  mitigation: budgets sized for repeated runs; artifact bureaucracy bounded to the slice-1 set; BC-002 measures rather than assumes
  owner: product owner
  status: open

- id: RISK-BUS-02
  risk: Single-operator dependency — process knowledge lives in one person
  probability: high
  impact: medium (bus factor, scaling ceiling)
  early_signal: gates only one person can run; undocumented judgment calls in learnings
  mitigation: this foundation (constitution, decisions, learnings) is the mitigation; skills encode operator judgment progressively
  owner: product owner
  status: open
```
