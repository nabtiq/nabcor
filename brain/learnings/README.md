# Learnings — append-only register

Structured, append-only lessons the system must consult (INV-MEM-001). One JSONL file
per class; entries are never edited or deleted — corrections append a superseding entry
referencing the original.

## Files

```text
patterns.jsonl      accepted/rejected implementation & creative patterns
preferences.jsonl   human taste signals (brand- or operator-scoped)
eval-failures.jsonl evaluator misses/false-alarms (feeds calibration)
performance.jsonl   real-world outcome observations (Phase 4+)
quirks.jsonl        engine/platform quirks (the BC-001 F05 class)
```

## Entry format (all files)

```json
{
  "learning_id": "LRN-0001",
  "class": "quirk",
  "statement": "Chromium eager-loads loading=lazy images inside display:none subtrees; hidden theme variants still download",
  "context": "theme-paired imagery delivery",
  "evidence": "BC-001 F05 — production-like network check; rework ≈25k output tokens",
  "evidence_class": "MEASURED",
  "scope": "global",
  "brand_ref": null,
  "action": "use CSS background scenes with [data-theme] selection; assert 'exactly one variant fetched' in smoke checks",
  "supersedes": null,
  "created_at": "2026-07-17",
  "source_ref": "josouralazl retrospective/data/failure-ledger.jsonl F05"
}
```

`scope` is `global` or `brand`; brand-scoped entries live under the brand namespace
when tenancy tooling exists (INV-DATA-001) — until then `brand_ref` gates retrieval.

## Seeding

The BC-001 canonical lessons (`retrospective/data/nabcor-learnings.jsonl`, L01–L15,
in the josouralazl repo) and failure guardrails (F01–F12) are the seed corpus. They are
**referenced, not copied**, until Phase 1 tooling imports them with their evidence
classes intact — import task noted in `FOUNDATION_REPORT.md` §10.

## Consultation rule

Skills declare which learning classes they read (`docs/AGENT_AND_SKILL_ARCHITECTURE.md`
per-skill `required_context`). Frontend/production skills must consult `quirks` before
novel delivery architecture; DIRECT skills must consult `preferences` for the brand.
A learning that would have prevented a defect but wasn't loaded is an eval-failure
entry.
