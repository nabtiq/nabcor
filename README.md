# nabcor

**nabcor** is Nabtiq's shared foundation for building client websites. It is a small monorepo that keeps three things apart on purpose: the **content** (the words and images for one site, written as typed files), the **theme** (how a site looks, shipped as a reusable package), and the **layout** (the Next.js app that wires them together). You build a new client site by cloning the demo app, swapping in that client's content file and a theme, and dropping their brand images into a folder. No CMS, no database, no admin panel — everything lives in code and is checked before it ships.

---

## The three-layer model

Every nabcor site is made of three layers that never mix. You change one without touching the others.

```
  ┌──────────────────────────────────────────────────────────┐
  │  1. CONTENT   the words + images for ONE site            │
  │               a typed content.ts file, checked by Zod    │
  │               bilingual (ar / en), no CMS                │
  └───────────────────────────┬──────────────────────────────┘
                              │  fills
                              ▼
  ┌──────────────────────────────────────────────────────────┐
  │  2. THEME     how the site LOOKS                          │
  │               a package (e.g. @nabcor/theme-novalt)       │
  │               one component per section + tokens.css      │
  │               chosen at build time, like a dependency     │
  └───────────────────────────┬──────────────────────────────┘
                              │  rendered by
                              ▼
  ┌──────────────────────────────────────────────────────────┐
  │  3. LAYOUT    the Next.js app (apps/demo)                 │
  │               serves /ar and /en, sets language +         │
  │               text direction on the server                │
  └──────────────────────────────────────────────────────────┘
```

- **Content** is a plain TypeScript file. Every piece of human text is written twice — `{ ar: "…", en: "…" }` — and the whole file is validated before the site builds.
- **Theme** is a separate package with one React component for each kind of section (hero, services, portfolio, and so on) plus a `tokens.css` of colors, spacing, and radii. The build fails if a theme is missing a component, so a broken theme can never ship.
- **Layout** is the app that pulls a content file and a theme together and serves the finished pages.

---

## Monorepo layout

```
nabcor/
├─ packages/
│  ├─ core/            @nabcor/core  — the shared engine
│  │                   content schema + Zod validator, the theme contract,
│  │                   shared components (Header, Footer, ContactForm, …),
│  │                   SEO builders (sitemap, robots, OG, RSS, llms.txt),
│  │                   a security-headers preset, the contact pipeline,
│  │                   and deploy scaffolding (Docker + Traefik + CI).
│  └─ theme-novalt/    @nabcor/theme-novalt — the reference theme
│                      a violet, editorial look for a fictional company
│                      "Novalt". Clone this to start a new theme.
├─ apps/
│  └─ demo/            a working Next.js site that uses core + theme-novalt.
│                      Content lives in src/content/novalt.ts.
│                      Clone this to start a new client site.
├─ docs/               guides (start with install-a-site.md)
└─ prompts/            reusable prompts for content + intake work
```

---

## Quick start

**Before you start:** Node 20 or newer and npm 10 or newer, installed on your machine.
**How long:** about 3 minutes.
**You'll know it worked:** the Novalt demo site opens in your browser in both Arabic and English.

From the root of the project, run:

```bash
npm install
```

```bash
npm run dev
```

Then open these two addresses in your browser:

- English: <http://localhost:3000/en>
- Arabic: <http://localhost:3000/ar>

The English page reads left-to-right; the Arabic page reads right-to-left. That direction is set on the server, so the page never flickers into the wrong direction while loading.

---

## Key commands

Run these from the project root.

| Command | What it does |
| --- | --- |
| `npm install` | Installs everything for all packages and the demo app. |
| `npm run dev` | Starts the demo site for local preview (`/en` and `/ar`). |
| `npm run build` | Builds the demo site for production. |
| `npm run start` | Serves the production build you just made. |
| `npm run validate-content` | Checks the content file and prints plain-language errors. Nothing ships until this passes. |
| `npm run validate-content -- broken` | Runs the check against a deliberately broken sample, to show the guard catching mistakes. |
| `npm run typecheck` | Confirms all the types line up, including that no theme is missing a component. |
| `npm run test:a11y` | Runs the accessibility gate (Playwright + axe). |

---

## Locked decisions

These seven choices are settled. Each one came out of an audit of five real Nabtiq sites, and each fixes a specific problem those sites ran into. Treat them as the ground rules.

| # | Decision | Why it's locked |
| --- | --- | --- |
| 1 | Next.js App Router + React + TypeScript, `output: 'standalone'`, npm | Unanimous across all five audited sites. |
| 2 | Static-first, built ahead of time — no CMS, no database, no admin UI | The mature sites already keep their content in code; it's simpler and safer. |
| 3 | Theme is chosen at build time as a dependency, not switched at runtime | Each site ships exactly one theme, baked in. |
| 4 | Language and text direction set on the server via next-intl | Fixes the right-to-left "flash of wrong direction" bug seen on an audited site. |
| 5 | Tailwind v4 with semantic CSS-variable tokens | Merges the best token setup from two audited sites. |
| 6 | Content is typed TypeScript, validated by Zod | Formalizes the file pattern the best sites already used. |
| 7 | Extensions are a typed contract only — no loader, no runtime | Keeps a safe socket for future add-ons without WordPress-style shared-process risk. |

**Version baseline (pinned):** Next.js 15.5.x, React 19.x, TypeScript 5.7+, Tailwind v4, next-intl v3, Zod. These versions were chosen to avoid the dangerous drift the audit found — do not bump to unreleased or canary versions.

---

## Where to go next

**New here? Start with [`docs/install-a-site.md`](docs/install-a-site.md).** It walks you, step by step, through turning this into a real client site: clone the demo, swap in the content and theme, add the brand images, and check that everything passes before it goes live.
