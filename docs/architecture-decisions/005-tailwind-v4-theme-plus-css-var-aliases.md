# ADR 005: Tailwind v4 `@theme` block plus semantic CSS-variable aliases

_One line: colors, spacing, and radii are defined once as CSS variables with meaningful names, wired into Tailwind v4, so themes stay consistent and easy to reskin._

**Status:** Accepted
**Date:** 2026-07-14

## Context

How a site handles design tokens — its colors, spacing steps, and corner radii — decides whether restyling it is a clean edit or a scavenger hunt through hard-coded values. The audited sites had two good but different approaches: one had strong Tailwind tooling, another had a well-organized token system. Neither had both.

## Decision

nabcor uses **Tailwind v4's `@theme` block** together with **semantic CSS-variable aliases**, defined in each theme's `tokens.css`.

- A theme first declares its **raw ramp** (for Novalt, the violet scale).
- It then maps that ramp to **meaning-based aliases** — variables named for their job, not their hue.
- Spacing follows a fixed scale (4 / 8 / 16 / 24 / 32 / 48 / 64 / 96) and radii come in three named steps (sharp 4px, soft 16px, pill).

This merges josouralazl's Tailwind tooling with nabtiq's token architecture.

## Consequences

- Reskinning is a matter of changing variable values in one file, not editing components.
- Every theme uses the same spacing and radius vocabulary, so sites feel consistent.
- It asks for discipline: new colors must be added as semantic aliases, not sprinkled in as raw values.

## Evidence

The audit identified josouralazl's tooling and nabtiq's token architecture as the two best token setups among the five repos. nabcor does not pick a winner — it combines them into one standard.
