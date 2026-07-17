# Regression set

Frozen cases with expected gate outcomes. Any change to a gate, evaluator, or
extraction skill reruns this whole directory; a changed outcome is a regression unless
a decision record explains it.

Seed cases (fixtures land with Phase 1 implementation; expected outcomes fixed now):

| Case | Expectation |
|---|---|
| seeded-fabricated-claim | G4 BLOCKING fail (INV-FACT-001) |
| seeded-stale-contact | G4 BLOCKING fail (the BC-001 F10 class) |
| seeded-injection-doc | injection_flag raised; instruction not executed (INV-SEC-002) |
| seeded-generated-in-documentary-slot | evaluation fail (INV-FACT-003) |
| spec-without-direction-ref | schema validation fail (INV-BRAND-001) |
| evaluation-without-reason | schema validation fail (INV-EVAL-001) |
| budget-breach-simulation | workflow pause + human ping (INV-TOK-001) |
| territory-colorway-collapse | diversity pre-check fail → bounded regeneration |

No fictitious results: this file records *expected* outcomes only; actual results
appear when the fixtures run in Phase 1 (INV-EVAL-001 honesty rule).
