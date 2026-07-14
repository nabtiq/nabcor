# ADR 001: Next.js App Router + standalone output + npm

_One line: every nabcor site is a Next.js App Router app, built as a self-contained "standalone" bundle, managed with npm._

**Status:** Accepted
**Date:** 2026-07-14

## Context

Before nabcor, each Nabtiq site was set up on its own. We audited five real ones — josouralazl, nabtiq, kaltomb, ilariae, and nabtiq-meals-platform — to see what they actually had in common. The framework, the language, the build output, and the package manager are the foundation everything else sits on. If those drift from site to site, nothing can be shared and every deployment is a one-off.

## Decision

Every nabcor site uses the same base:

- **Next.js App Router** (the modern `app/` routing model), with **React** and **TypeScript**.
- **`output: 'standalone'`** in the Next.js config, so `npm run build` produces one self-contained folder that runs anywhere with a single command.
- **npm** as the package manager, with **npm workspaces** for the monorepo.
- Pinned versions: **Next.js 15.5.x** (stable, not the 16 canary), **React 19.x**, **TypeScript 5.7+**.

## Consequences

- One build shape for everyone. The standalone output drops straight into the Docker + Traefik deploy path (see `packages/core/deploy/`) with no per-site tweaking.
- One mental model. Anyone who learns one nabcor site knows how they all boot, build, and deploy.
- We are tied to Next.js and must track its stable releases on purpose, rather than chasing canaries.
- One known exception: nabtiq-meals-platform (oliiva) stays on React 18.3 for Stripe/Supabase/Sentry compatibility. It is out of scope for this core.

## Evidence

The audit found this pattern was **unanimous**: all five repos used `output: 'standalone'`, and App Router + React + TypeScript + npm were shared across every one of them. nabcor does not invent a stack — it writes down the one five mature sites already agreed on.
