# Research — Agent patterns from 500-AI-Agents-Projects

**Source:** https://github.com/ashishpatel26/500-AI-Agents-Projects (fetched
2026-07-17; ~34.6k stars). A curated catalog of 500+ agent projects organized by
framework (LangGraph, CrewAI, AutoGen, Agno, LlamaIndex) and industry (healthcare,
finance, education, retail, legal, +15 more), with self-contained examples under
`/agents/`.
**Method note:** analysis is based on the repository's catalog page and pattern
taxonomy, evaluated against NABCor's constitution/invariants — not on running its
projects. It is a pattern library for us, never a product architecture (Master Prompt
§8). Per-pattern verdicts below; overall verdict at the end.

```yaml
- pattern: supervisor / orchestration
  problem_solved: coordinating specialized workers toward one goal
  mechanism: central agent delegates subtasks, integrates results (LangGraph/CrewAI staples)
  strengths: single point of control; clear integration point
  weaknesses: supervisor context grows; workers multiply token cost; failure attribution blurs
  failure_modes: delegation loops; workers drifting from goal; supervisor as bottleneck
  token_implications: high — every delegation round-trips context
  nabcor_use_case: NABCor already has the shape with the roles inverted — ONE orchestrator invoking SKILLS (not autonomous workers)
  recommendation: adapt — keep the coordination idea, reject autonomous workers (INV-AGENT-001; BC-001 L01)

- pattern: router / dynamic selection
  problem_solved: choosing the right tool/model/strategy per input
  mechanism: classifier step routes to specialized paths
  strengths: cheap inputs get cheap paths
  weaknesses: routing errors compound downstream
  failure_modes: misrouting; router becoming an unmaintained rule pile
  token_implications: strongly positive when routing to cheaper tiers
  nabcor_use_case: the model gateway routing policy (tiers 0–4) IS this pattern, deterministic where possible
  recommendation: adopt — as gateway config, not as an agent (docs/MODEL_AND_TOKEN_STRATEGY.md §3)

- pattern: plan-and-execute
  problem_solved: multi-step tasks needing coherent sequencing
  mechanism: plan artifact first, then step execution against it
  strengths: inspectable plans; bounded steps
  weaknesses: stale plans when reality diverges mid-run
  failure_modes: executing a wrong plan confidently
  token_implications: moderate; plan is small, re-planning is not
  nabcor_use_case: the slice workflow is a FIXED plan (deterministic pipeline + gates) — better than per-run planning for a known pipeline
  recommendation: adapt — deterministic workflow for the slice; per-run planning only inside bounded agentic skills (compose-homepage)

- pattern: reflection / self-critique
  problem_solved: quality improvement via self-review
  mechanism: generate → critique → revise loops
  strengths: catches shallow errors cheaply
  weaknesses: converges to self-agreement; burns tokens; the anti-goal "endless self-critique loop"
  failure_modes: unbounded loops; critique theater (style edits, no substance)
  token_implications: multiplicative per iteration
  nabcor_use_case: single bounded critique passes with distinct rubrics (critique-territories, G8) — never open-ended loops
  recommendation: adapt — one bounded critique pass per artifact class, rubric-anchored (INV-TOK-001 hard limits)

- pattern: critic and reviser (separated roles)
  problem_solved: independent judgment vs self-review bias
  mechanism: separate evaluator context scores producer output
  strengths: separation matches our evaluator concept; calibratable
  weaknesses: critic miscalibration (RISK-AI-02); cost
  failure_modes: fake precision; critic-producer collusion via shared context
  token_implications: one extra pass per artifact
  nabcor_use_case: the EVALUATE domain — evaluators as skills with declared authority, reasons, evidence
  recommendation: adopt — already core architecture (INV-EVAL-001), with authority levels the catalog examples lack

- pattern: parallel workers
  problem_solved: throughput on independent subtasks
  mechanism: fan-out, join
  strengths: wall-clock wins on independent work
  weaknesses: coordination cost; duplicated context per worker
  failure_modes: divergent outputs needing expensive reconciliation
  token_implications: context duplicated N times unless inputs are artifact-scoped
  nabcor_use_case: 3 territories generated in parallel from one small brief artifact; 3 social specs likewise
  recommendation: adopt narrowly — bounded fan-outs (N=3) over small artifact inputs (INV-TOK-002 keeps the duplication cheap)

- pattern: human-in-the-loop
  problem_solved: judgment, approval, safety at decision points
  mechanism: workflow pauses for human action
  strengths: exactly BC-001's validated value carrier
  weaknesses: latency; gate fatigue
  failure_modes: rubber-stamping; automation slowly eroding gates
  token_implications: negligible; saves the cost of wrong directions
  nabcor_use_case: the five mandatory gates (INV-HUM-001), decision records at each
  recommendation: adopt — already an invariant; the catalog confirms the pattern's ubiquity, not its design

- pattern: retrieval (RAG variants — adaptive, self-RAG, corrective)
  problem_solved: grounding generation in stored knowledge
  mechanism: embed + similarity retrieve + condition generation
  strengths: scales to large corpora
  weaknesses: infrastructure; silent retrieval misses; relevance ≠ authority
  failure_modes: retrieving stale/wrong-brand context (INV-DATA-001 hazard)
  token_implications: positive vs full-context, negative vs targeted file reads at small corpus
  nabcor_use_case: Second Brain discovery — deferred; naming-convention + front-matter selectors first
  recommendation: reject for now — DEC-0002 explicitly; revisit trigger defined (retrieval misses / >200 units)

- pattern: structured extraction
  problem_solved: turning unstructured sources into typed data
  mechanism: schema-constrained model output + validation
  strengths: exactly the UNDERSTAND domain's shape
  weaknesses: schema-forcing can pressure fabrication (BC-001 FAIL-05 class: min-1-item rules nudging invention)
  failure_modes: confident wrong extraction; fabrication under schema pressure
  token_implications: efficient; retries bounded by validation
  nabcor_use_case: extract-source-facts → claim records with provenance
  recommendation: adopt — with the anti-fabrication twist the catalog examples lack: optional-by-design fields + gap lists instead of forced completion

- pattern: tool-using agent
  problem_solved: acting on the world (files, APIs, capture)
  mechanism: model chooses among declared tools
  strengths: flexible
  weaknesses: unbounded tool loops; destructive-tool risk
  failure_modes: tool thrashing; side effects without authorization
  token_implications: tool results inflate context fast
  nabcor_use_case: tool-assisted skills (classify-input, extract) with declared tools + max_tool_calls
  recommendation: adapt — tools declared per skill, budgeted (INV-TOK-001), destructive ops human-gated (AGENTS.md)

- pattern: retry and recovery
  problem_solved: robustness to transient failures
  mechanism: classify failure type, retry with backoff or degrade
  strengths: matches BC-001 F01 lesson (outage = retry class, not debugging class)
  weaknesses: retries hide real defects when unclassified
  failure_modes: unbounded retry loops (anti-goal)
  token_implications: each retry is a full re-spend — bound it
  nabcor_use_case: gateway retry policy + typed skill failures + ci_outage_policy
  recommendation: adopt — bounded, classified, recorded in run records (failure_type)

- pattern: multi-agent collaboration (peer agents debating/cooperating)
  problem_solved: diverse perspectives on open problems
  mechanism: multiple autonomous contexts exchanging messages
  strengths: occasionally surfaces non-obvious angles
  weaknesses: token-expensive; coordination overhead; consensus ≠ quality
  failure_modes: agreement cascades; runaway conversations
  token_implications: worst in the catalog — full-context message exchange
  nabcor_use_case: none demonstrated; BC-001 evidence says artifacts+gates beat agent count at our scale
  recommendation: reject — INV-AGENT-001; reopen only via measured-bottleneck decision record

- pattern: hierarchical teams
  problem_solved: scale beyond one supervisor's span
  mechanism: supervisors of supervisors
  strengths: organizational scale
  weaknesses: everything from supervisor + multi-agent, squared
  failure_modes: context fragmentation across layers
  token_implications: very high
  nabcor_use_case: none at any foreseeable scale
  recommendation: reject

- pattern: workflow orchestration (deterministic graphs — LangGraph's core value)
  problem_solved: reliable multi-step processes with state
  mechanism: explicit graph of steps, deterministic transitions, checkpoints
  strengths: exactly P7 (deterministic governs generative); inspectable; resumable
  weaknesses: framework lock-in if adopted as dependency
  failure_modes: graph complexity growth
  token_implications: neutral; enables budgets per node
  nabcor_use_case: the slice pipeline (§3 of FIRST_VERTICAL_SLICE)
  recommendation: adapt — the PATTERN as a thin script (Phase 1); a framework (LangGraph etc.) only via decision record with rejected alternatives (AGENTS.md rule 3)
```

## Synthesis

- **Genuinely useful for NABCor:** router (as gateway policy), critic-with-authority
  (EVALUATE), bounded parallel fan-outs, human-in-the-loop, structured extraction
  with anti-fabrication, classified retry, deterministic workflow orchestration.
- **Unnecessary complexity at our scale:** supervisor-with-autonomous-workers,
  multi-agent collaboration, hierarchical teams — all rejected under INV-AGENT-001
  with BC-001 evidence; the catalog's abundance of examples is survivorship of demos,
  not evidence of necessity (exactly the trap §8 warns about).
- **Deterministic-workflow candidates:** plan-and-execute and orchestration collapse
  into the slice's fixed pipeline; routing collapses into gateway config.
- **Reusable-skill candidates:** extraction, critique, retry policies — all already in
  the skill catalog.
- **Needing human approval:** anything crossing INV-HUM-001's six classes — the
  catalog's HITL examples confirm placement, not policy.
- **Too expensive:** multi-agent collaboration, unbounded reflection.
- **Dangerous for factual/creative integrity:** schema-forced extraction without
  optional fields (fabrication pressure); self-critique loops that converge on
  agreeable sameness (genericity pressure); autonomous publishers in several catalog
  projects (INV-PUB-001 violation class).

## Verdict

```text
ADAPT
```

Adopt the seven useful patterns in their NABCor-shaped forms (most already encoded in
the foundation); reject autonomous-multi-agent structures absent measured need; adopt
no framework dependency from the catalog at this time (decision-record gate stands).
NABCor use case: pattern vocabulary for skill/workflow design in Phases 1–3.
