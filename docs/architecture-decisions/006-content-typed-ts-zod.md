# ADR 006: Content is typed TypeScript, validated by Zod

_One line: a site's content is a typed TypeScript file, checked by Zod before anything ships, so mistakes are caught with plain-language errors instead of reaching production._

**Status:** Accepted
**Date:** 2026-07-14

## Context

Every site needs its words and images stored somewhere. With no CMS or database (ADR 002), that "somewhere" is a file. A loose file — a bag of untyped JSON — lets typos, missing fields, and a forgotten Arabic translation slip through to a live page. Across the audited sites, content handling and the pieces around it (the contact form, translations, direction) were built from scratch again and again, each slightly different.

## Decision

nabcor content is a **typed TypeScript module** matching the `SiteContent` schema, and it is **validated by Zod** before the site builds.

- Every field with human text is a **`LocalizedText`** — `{ ar: string; en: string }` — so a missing translation is a visible error, not a blank space.
- Running **`npm run validate-content`** checks the file and prints plain-language errors. Nothing ships until it passes. (`npm run validate-content -- broken` shows the guard catching a deliberately broken file.)

## Consequences

- Whole categories of mistakes — wrong field names, missing translations, malformed sections — are caught before a build, not by a visitor.
- The editor gets type hints and autocomplete while writing content.
- Editing requires touching a TypeScript file, which is mitigated by the intake prompts in `prompts/` and the worked Josoor Al-Azel example.

## Evidence

The audit found josouralazl and nabtiq already used typed `lib/*.ts` content modules — the pattern that worked. It also found that content-adjacent pieces like the contact form and i18n were **reinvented repeatedly** across the five repos. nabcor formalizes the good pattern and adds a Zod gate so the guarantee is enforced, not hoped for.
