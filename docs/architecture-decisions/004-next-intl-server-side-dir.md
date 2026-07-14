# ADR 004: next-intl with language and text direction set on the server

_One line: the page's language and left-to-right / right-to-left direction are decided on the server, so an Arabic page never flickers into the wrong direction while loading._

**Status:** Accepted
**Date:** 2026-07-14

## Context

nabcor sites are bilingual: Arabic (right-to-left) and English (left-to-right). The page has to know its language (`lang`) and its text direction (`dir`) the instant it appears. If that decision is made in the browser after the page loads, an Arabic visitor sees the page briefly render left-to-right and then snap to the right — a "flash of wrong direction." Handling two languages and their direction was also being reinvented, differently, on site after site.

## Decision

nabcor uses **next-intl** for translations, and sets **`lang` and `dir` on the `<html>` element on the server** — before the page is sent to the browser. Each language gets its own route: `/ar` and `/en`. The server-rendered pattern from josouralazl is the model to copy.

## Consequences

- No flash of wrong direction. The Arabic page arrives already right-to-left; the English page arrives already left-to-right.
- Language and direction are one shared, correct mechanism instead of a per-site reinvention.
- It depends on server rendering of the locale, which the App Router + standalone setup (ADR 001) already provides.

## Evidence

The audit traced the flash-of-wrong-direction bug to **ilariae**, which set `dir` on the client inside a `useEffect` — so the correction happened only after the page had already painted the wrong way. **josouralazl** set it on the server and had no such flicker. nabcor adopts josouralazl's server-side approach and retires ilariae's client-side one.
