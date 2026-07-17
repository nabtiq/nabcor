# Migration Manifest — legacy website foundation to Creative OS

**Date:** 2026-07-17
**Purpose:** make the clean restart auditable. This is a migration record, not an
argument for carrying the old product forward.

## Retained and adapted

| Area | Treatment | Reason |
|---|---|---|
| Product constitution and invariants | retained, legacy references removed | They define the new Creative OS and its safety boundaries. |
| Provenance and confidence model | retained | Evidence-before-claim is product-defining. |
| Decision system | retained and made operational through the Second Brain | Decisions and rejections are part of the moat. |
| Artifact contracts | retained, strict validation preserved | Typed artifacts prevent silent drift and fabrication pressure. |
| Evaluation framework and rubrics | retained | Evaluation before scale is a core principle. |
| Model/token strategy | retained as hypotheses where unmeasured | Cost visibility is architectural; exact budgets still require experiments. |
| First vertical-slice design | retained as a proposed decision | It tests the intelligence spine without rebuilding a full platform. |
| BC-001 findings | distilled into `brain/learnings/BC-001.md` | The evidence is useful; the old implementation is not the new product. |
| Agent-pattern research | retained as research, not architecture | Patterns inform choices without importing framework complexity. |

## Excluded from the clean baseline

| Legacy area | Why excluded |
|---|---|
| `apps/demo` Next.js application | It embodies the old website-builder product definition. |
| `packages/core` website runtime | Useful as a separate historical channel implementation, not the new system core. |
| `packages/theme-novalt` and `packages/theme-plain` | Theme packages and demo assets would make the clean repository look like a template system. |
| Website deployment/Docker/Traefik templates | Publishing infrastructure is outside the first proof. |
| Prompts 01–08 for clone-and-swap site delivery | They are tied to the old repository and artifact model. |
| Website-specific operational guides and ADRs | Next.js, Tailwind, CMS, and runtime-theme decisions must not bind the Creative OS. |
| Demo images, fonts, test results, and generated assets | They are not canonical evidence for the new product. |
| Old root README and workspace package configuration | They define NABCor as a website monorepo, which is no longer true. |
| Foundation execution transcript/master prompt at repository root | The durable results belong in canonical artifacts; process history does not govern the product. |

## Preserved boundary

The legacy repository may be archived as a historical branch or tag. If a future
website channel adapter needs code from it, that code must enter through a new decision
record, a defined adapter contract, and tests. No legacy component is canonical merely
because it existed first.

## Clean-baseline rule

The new repository begins with product truth, contracts, evaluation, and memory. It
does not begin with a framework or a user interface. Implementation choices start only
after the relevant decisions are ratified.
