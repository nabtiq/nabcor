# NABCor

> Evidence-aware AI Creative Operating System for building distinctive, coherent brand worlds across channels.

**Foundation version:** `0.1.0`
**Status:** clean architecture baseline; no production implementation has started.

## What NABCor is

NABCor is not a website builder and it is not a collection of AI generators. It is a
creative operating system that turns evidence, intent, human judgment, and measured
outcomes into a durable brand intelligence spine:

```text
Truth and evidence
  → intent and strategy
  → creative territories
  → human direction decision
  → brand DNA and visual world
  → channel specifications
  → deterministic + model-assisted evaluation
  → human feedback and outcomes
  → institutional memory
```

Websites, social assets, campaigns, presentations, ads, and video concepts are channel
expressions of that spine. They are not independent products and must not become
unrelated generators.

## لماذا أُعيد بناء المستودع؟

بدأ NABCor كقاعدة تقنية لبناء مواقع Next.js للعملاء. تلك النسخة أثبتت دروساً مفيدة
عن العقود، التحقق، العربية، وحماية الحقائق، لكنها لم تعد تمثل المنتج الذي نريد بناءه.
هذه الحزمة تبدأ من تعريف المنتج الجديد مباشرة: نظام تشغيل إبداعي يفهم العلامة، يصنع
اتجاهاً مميزاً، يقيّم نتائجه، ويتعلم من القرارات والرفض والأداء. كود المواقع والقوالب
القديمة غير موجود هنا؛ ما بقي منها هو الدليل والتعلّم القابلان للتعميم فقط.

## Two input modes

1. **Prompt-only:** the user has an intent but little verified material. NABCor keeps
   unknowns visible, asks high-impact questions, and never turns assumptions into facts.
2. **Evidence-rich:** the user supplies documents, imagery, brand material, or URLs.
   NABCor records provenance and rights, extracts claims, surfaces contradictions, and
   builds a reusable Brand Context Package.

Both modes converge on three genuinely distinct creative territories, a recorded human
selection, one coherent visual world, channel specs, an evaluation report, and durable
memory.

## Product principles

- Concept before execution.
- Brand before channel.
- Evidence before claim.
- Distinctiveness before decoration.
- Consistency without repetition.
- Explainable, versioned decisions.
- Deterministic systems govern generative systems.
- Human authority at high-impact gates.
- Evaluation before scale.
- Memory must improve the next run.
- Use the smallest sufficient agentic structure.
- Token efficiency is architectural.

The binding definitions live in
[`constitution/PRODUCT_CONSTITUTION.md`](constitution/PRODUCT_CONSTITUTION.md) and
[`constitution/INVARIANTS.md`](constitution/INVARIANTS.md).

## First proof, not the whole platform

The proposed first vertical slice proves the intelligence spine before building broad
production infrastructure:

```text
input
→ Brand Context Package
→ three creative territories
→ human selection
→ creative direction + brand DNA + visual world
→ one homepage specification + three connected social specifications
→ evaluation report + saved decisions
```

It stops at specifications. Authentication, billing, publishing, a multi-agent runtime,
large-scale image/video generation, analytics ingestion, and additional channels are
deferred until the slice produces measured evidence.

## Second Brain from day one

The repository itself is the initial Second Brain. Every working session begins with:

1. [`constitution/PRODUCT_CONSTITUTION.md`](constitution/PRODUCT_CONSTITUTION.md)
2. [`brain/current/NOW.md`](brain/current/NOW.md)
3. relevant invariants, decisions, contracts, risks, and experiments

Durable information is never left only in chat. Decisions go to `brain/decisions/`,
experiments to `brain/experiments/`, reusable findings to `brain/learnings/`, current
state to `brain/current/`, and obsolete context to `brain/archive/`. The operating rules
are in [`brain/README.md`](brain/README.md) and [`AGENTS.md`](AGENTS.md).

## Repository map

```text
constitution/   mission, product boundaries, invariants, north-star experience
brain/          current state, decisions, experiments, learnings, research, archive
contracts/      strict versioned artifact schemas + positive/negative fixtures
docs/           domain, provenance, evaluation, model, workflow, and slice design
evals/          rubrics plus benchmark and regression plans
skills/         skill specifications; implementation starts only after ratification
scripts/        deterministic repository and Second Brain validation
.github/        validation workflow
```

There is intentionally no legacy website application, theme package, deployment stack,
or production runtime in this baseline.

## Validate the foundation

Requirements: Node.js 20+ and npm 10+.

```bash
npm ci
npm run validate
```

`npm run validate` checks all artifact contracts, positive and negative fixtures,
cross-field invariants, Second Brain record structure, required foundation files, and
the absence of legacy product artifacts.

## Source-of-truth hierarchy

1. Product Constitution
2. Invariants
3. Ratified decisions
4. Versioned contracts
5. Current Second Brain state
6. Approved roadmap phase
7. Active experiments
8. Research
9. Working notes
10. Archive

Higher sources win. Conflicts are recorded; they are never silently reconciled.

## Start here

- Product definition: [`constitution/PRODUCT_CONSTITUTION.md`](constitution/PRODUCT_CONSTITUTION.md)
- Current state: [`brain/current/NOW.md`](brain/current/NOW.md)
- Roadmap: [`brain/current/ROADMAP.md`](brain/current/ROADMAP.md)
- Open decisions: [`brain/current/OPEN_QUESTIONS.md`](brain/current/OPEN_QUESTIONS.md)
- First slice: [`docs/FIRST_VERTICAL_SLICE.md`](docs/FIRST_VERTICAL_SLICE.md)
- Migration record: [`MIGRATION_MANIFEST.md`](MIGRATION_MANIFEST.md)

## License

No public license has been selected. Treat the repository as private/proprietary until
the product owner records a licensing decision.
