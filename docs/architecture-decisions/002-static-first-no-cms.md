# ADR 002: Static-first, build-time rendering — no CMS, no database, no admin UI

_One line: a site's words and images live in code and are baked in at build time; there is no live content system to log into._

**Status:** Accepted
**Date:** 2026-07-14

## Context

A common instinct is to put a content management system (like WordPress), a database, or an admin panel behind a website so someone can edit it live. That adds a server to run, a database to back up, logins to secure, and plugins that can break. We looked at how the five audited Nabtiq sites actually worked in practice.

## Decision

nabcor is **static-first**. Content is written as code and rendered when the site is built, not fetched at runtime.

- **No runtime CMS.** The words and images come from a typed content file, not a live editor.
- **No database.** There is nothing to query while a visitor loads a page.
- **No admin UI.** Editing a site means editing its content file and rebuilding.

Pages are produced ahead of time and served as finished files.

## Consequences

- Fast and cheap to host — there is no server-side app or database burning resources per visit.
- Safer. There is no login screen, no plugin marketplace, and no database to breach.
- Every change is versioned in git, so you can see who changed what and roll back.
- The trade-off: a non-developer cannot log in and edit text live. Changes go through the content file and a rebuild. This is mitigated by the typed, validated content format (ADR 006) and the intake prompts in `prompts/`.

## Evidence

The audit found **four of four** mature sites already kept their content in code rather than a live CMS. The admin-panel-and-database approach was the exception, not the norm. nabcor formalizes what the successful sites already did.
