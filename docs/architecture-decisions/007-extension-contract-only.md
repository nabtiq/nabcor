# ADR 007: Extensions are a typed contract only — no loader, no runtime

_One line: nabcor reserves a safe, typed "socket" for future add-ons but ships nothing that actually runs them, avoiding WordPress-style shared-process risk._

**Status:** Accepted
**Date:** 2026-07-14

## Context

Plugins are tempting: they let a system grow without changing its core. But WordPress shows the danger. Its real flaw is not that plugins exist — it is the **execution model**: every plugin runs in the same process with the same permissions, so one bad or hacked plugin can compromise the whole site. We wanted room to grow later without inheriting that risk now.

## Decision

nabcor defines an extension **contract only**, and ships **zero runtime**.

- There is a typed, capability-scoped interface — **`NabcorExtension`** with `id`, `capabilities[]`, and `hooks` — that describes what a future extension could declare.
- There is **no loader, no registry, and no runtime** that reads, installs, or executes extensions.

The socket is reserved in the type system. Nothing plugs into it yet.

## Consequences

- There is no plugin execution surface today, so there is nothing for a malicious add-on to exploit — the WordPress shared-process failure mode simply does not exist here.
- The shape of future extensions is agreed on now, in types, so when a loader is eventually built it can be capability-scoped from day one rather than retrofitted.
- The honest limitation: extensions cannot actually run yet. This is a promise about the future, deliberately without an engine behind it.

## Evidence

The audit's reading of WordPress located the problem in its execution model — shared process, shared permissions — not in the existence of plugins. None of the five audited Nabtiq sites needed a plugin runtime to do their job. nabcor keeps the option open at the type level and refuses to build the risky part until it is genuinely needed.
