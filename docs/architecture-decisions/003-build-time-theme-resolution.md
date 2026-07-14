# ADR 003: Theme resolution is build-time, not runtime

_One line: a site picks exactly one theme by installing it as a dependency; the choice is baked in at build time, and the build fails if the theme is incomplete._

**Status:** Accepted
**Date:** 2026-07-14

## Context

Some systems let you switch themes while the site is running — a dropdown in an admin panel, a theme engine loading styles on the fly. That flexibility costs a runtime system to maintain and a whole class of "which theme am I even looking at?" bugs. In practice, each Nabtiq client site ships one look and keeps it.

## Decision

A nabcor theme is a **package** (for example `@nabcor/theme-novalt`), and a site chooses it the same way it chooses any other dependency: it installs it and imports it. The choice is resolved **at build time**, not switched at runtime.

The theme must satisfy the **NabcorTheme contract**: `components` is a mapped type covering every section type. Because the contract lists every section, a theme that forgets a component **fails `tsc`** (run via `npm run typecheck`). That compile error is the safety net — a half-finished theme physically cannot ship.

## Consequences

- No runtime theme engine to build, secure, or debug. The final site carries only the one theme it uses, so it stays small and fast.
- Changing a site's look means swapping the theme dependency and rebuilding — a deliberate, reviewable step, not a live toggle.
- Totality is guaranteed by the compiler, not by a checklist a human might miss.

## Evidence

The audit found each mature site shipped exactly one baked-in look; none needed or had runtime theme switching. Building a runtime theme engine would have added complexity none of the five sites asked for.
