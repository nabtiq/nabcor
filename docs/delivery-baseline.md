# Delivery Baseline — pre-nabcor custom builds

**Purpose.** nabcor's success criterion is a **≥50% reduction in website delivery
time** versus our previous from-scratch custom builds. That claim is unmeasurable
without a baseline. This document captures the effort of two real recent
projects — **Josoor Al-Azel** (`nabtiq/josouralazl`, insulationbridges.com) and
**Ilariae** (`nabtiq/ilariae`) — as the yardstick the first nabcor-powered
project will be measured against.

## Methodology & bias warning

Retrospective effort estimates are biased — hindsight compresses or inflates
remembered work. To limit that, every figure below is tagged:

- **[git]** — grounded in verifiable repository evidence (commit timestamps,
  commit counts, PR history, deploy-workflow runs). Reproduce with the commands
  in the appendix.
- **[estimate]** — recollection-only, because the work happened **before the
  first commit** (content intake, file normalization, design decisions) or
  **outside git** (client revision rounds, review calls). These are the
  honest weak points; treat them as order-of-magnitude, not accounting.

A structural limitation to keep in mind: **git measures the committed coding
span only.** It does not see the intake work that precedes the first commit, nor
the client back-and-forth that a static site's git history under-records. So the
git span is a *lower bound* on total delivery time, and the categories that
matter most for the nabcor comparison (intake, structuring, revisions) are the
ones git cannot see.

## Verified repository evidence — [git]

| Metric | Josoor Al-Azel | Ilariae |
|---|---|---|
| First commit | 2026-07-10 23:27 (+03) | 2026-06-27 04:53 (+03) |
| Last commit | 2026-07-13 17:05 (+03) | 2026-06-27 23:24 (+03) |
| **Committed coding span** | **~2.7 days** (65.6 h calendar) | **~18.5 hours** (single day) |
| Total commits | 19 | 3 |
| Pull requests (all states) | 2 | 0 |
| Deploy-workflow runs | 8 | 0 (manual VPS deploy) |
| Files tracked | 135 | 73 |

Josoor's commit subjects cluster by area — a rough signal of where the coding
effort went: **hero ×4, deploy ×4, rtl ×2, content ×2, contact ×2, arabic ×2**,
then single commits touching theme, sitemap, seo, robots, locale, form, docker,
css, a11y. Ilariae has too few commits (3) to distribute meaningfully, which is
itself a finding: its history is a near-single-shot build with no PRs and no CI
deploys.

**Reading these honestly:** both sites were built *fast* already — Josoor's
committed coding was under three calendar days, Ilariae's under one. That makes
the ≥50% target ambitious, but it also means the baseline's real cost is not the
coding — it is the **un-committed** intake and revision work described next.

## Effort breakdown by phase

Per-phase estimates for **Josoor Al-Azel** (the richer of the two — bilingual,
RTL, contact pipeline, Dockerised deploy). Hours are working-hours estimates,
not calendar time. The "nabcor changes this" column is why each phase is
expected to shrink.

| Phase | Josoor effort | Basis | What nabcor changes |
|---|---|---|---|
| Content intake (triage the 63 MB PDF, brochure-page `.docx` with interleaved AR/EN, ~20 unnamed WhatsApp/iPhone photos) | ~6–8 h | [estimate] — pre-first-commit | A documented intake protocol + prompts (steps 01–04) standardize triage; still human-bound, modest gain |
| Content structuring (into a typed model) | ~4–6 h | [estimate] + partly [git] (`content ×2`) | The `SiteContent` schema + `validate-content` give a fixed target and catch gaps early — meaningful gain |
| Component implementation | ~8–12 h | [git] (`hero ×4`, `contact`, `footer/header`) | Reused core + theme components; a token-only theme can ship `components: {}` — **largest gain** |
| Styling / design tokens | ~4–6 h | [git] (`theme`, `css`) | One token system; per-client work becomes token *values* — large gain |
| RTL work | ~3–5 h | [git] (`rtl ×2`, `arabic ×2`) | Server-side `dir`/`lang` + RTL-safe components built in — large gain (was hand-rolled) |
| Localization (AR/EN copy wiring) | ~3–4 h | [estimate] + [git] (`locale`) | next-intl + `LocalizedText` schema standard — moderate gain |
| SEO / meta | ~2–3 h | [git] (`sitemap`, `seo`, `robots`) | On-by-default SEO builders (robots/sitemap/OG/RSS/llms.txt) — large gain (was per-file) |
| Accessibility | ~2–3 h | [git] (`a11y`) | a11y gate + accessible defaults — moderate gain |
| Deployment | ~4–6 h | [git] (`deploy ×4`, `docker`, 8 runs) | Parameterized Docker+Traefik+CI templates — large gain (was re-authored) |
| Client revisions | ~4–8 h | [estimate] — mostly outside git | Content-only edits + `validate-content` shorten the loop — moderate gain |
| **Total (working hours)** | **~40–61 h** (~5–8 working days) | mixed | Target: **≤ ~20–30 h** |

Ilariae, being simpler (and with a non-functional contact form — it never wired a
backend), likely landed at the **low end, ~24–32 working hours [estimate]**,
consistent with its sub-day committed span plus un-committed intake.

## The measurable target

Taking Josoor's **~40–61 working hours** as the reference for a
bilingual-RTL marketing site, a ≥50% reduction means the first nabcor project of
comparable scope should ship in **≤ ~20–30 working hours**. The phases nabcor
attacks hardest — component implementation, styling, RTL, SEO, deployment — are
exactly the ones with the largest committed-effort share, which is the basis for
believing the target is reachable.

## How the first nabcor project will be measured

To make the comparison honest rather than another biased estimate, instrument
the first real client build from day one:

1. **Stamp the start** — record the moment the client ZIP lands (intake start),
   not the first commit.
2. **Timebox each phase** against the table above; log actual hours per phase.
3. **Use git as the anchor** — first commit, first successful deploy run, and PR
   timestamps give a verifiable coding span to compare against Josoor's 2.7 days.
4. **Count revision rounds** explicitly (they are the least-visible cost).
5. Publish the actuals next to this table. If total working hours are **≤ ~30**
   for a Josoor-class site, the ≥50% goal is validated; if not, this document is
   the evidence for *why not*, by phase.

## Appendix — reproduce the [git] figures

```bash
# per repo (after: git fetch --unshallow)
git log --reverse --format='%ai' | head -1     # first commit
git log -1 --format='%ai'                       # last commit
git rev-list --count HEAD                        # total commits
gh pr list --repo nabtiq/<repo> --state all --json number   # PR count
gh run list --repo nabtiq/<repo> --json conclusion          # deploy runs
```

> Note: these two repos were shallow-cloned for the original audit; the figures
> above were taken after `git fetch --unshallow`. Commit spans are calendar
> deltas between first and last commit — an under-count of total delivery time,
> per the methodology note.
