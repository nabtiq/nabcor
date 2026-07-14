# Pipeline 07 — Assemble and validate (wire content + theme, then prove it's sound)

This is a reusable prompt for one stage of the nabcor build pipeline. Run it after the client's **content file** exists (from the content stage) and their **theme package** exists (stage 06). Its job is to wire those two into the app, then run the two gates every nabcor site must pass — the content check and the accessibility check — and fix anything they catch.

---

## Before you start

You need:

1. **The client's content file** — a typed `*.ts` content module (like `apps/demo/src/content/novalt.ts`), with both `en` and `ar` text filled in.
2. **The client's theme package** — `@nabcor/theme-<client>` from stage 06, passing `typecheck`.
3. **The client's brand images** in place under `apps/demo/public/media/`, named by the nabcor convention (kebab-case, no camera names).
4. Node 20+ and npm 10+, and the project installed (`npm install` once).

## How long this takes

About **20 to 40 minutes**, most of it fixing whatever the two checks flag the first time.

## How you'll know it worked

Three commands all come back green: `npm run validate-content` prints a valid check, `npm run build` finishes with no red **error** lines, and `npm run test:a11y` passes on both the English and Arabic pages. When all three pass, the site is assembled and sound.

---

## Inputs

- The client's content module (`*.ts`).
- The client's theme package `@nabcor/theme-<client>`.
- The client's brand images under `apps/demo/public/media/`.

## Outputs

- The app (`apps/demo`) wired to the client's content and theme, rendering `/en` and `/ar`.
- A **green** content check, a clean production build, and a **passing** accessibility gate.

---

## Steps

> nabcor's model is *clone-and-swap*: you keep working inside `apps/demo` and swap in the client's content, theme, and images (this is how [`docs/install-a-site.md`](../docs/install-a-site.md) starts a new site). The steps below assume that.

### 1. Put the content file in place

Copy the client's content module into `apps/demo/src/content/`. You can either keep the demo's filename (`novalt.ts`) and paste the client's content into it, or add the client's own file (for example `josoor.ts`). If you add a new filename, update the imports that point at the content so they name your file. The places that import the content are:

- `apps/demo/src/app/[locale]/layout.tsx`
- `apps/demo/src/app/[locale]/page.tsx`
- `apps/demo/src/app/robots.ts`
- `apps/demo/src/app/sitemap.ts`
- `apps/demo/src/app/llms.txt/route.ts`

Each one imports `from '@/content/novalt'` — point it at your file if you renamed it. (Keeping the name `novalt.ts` avoids this step entirely.)

### 2. Add the theme as a dependency and wire it in

In `apps/demo/package.json`, under `dependencies`, replace the reference theme with the client's:

```jsonc
"@nabcor/theme-<client>": "*"
```

(You can leave `@nabcor/theme-novalt` in as well if you like, but the site only uses one.)

Then point the app at the client theme in two places:

- **`apps/demo/src/app/globals.css`** — change the tokens import from `@import '@nabcor/theme-novalt/tokens.css';` to `@import '@nabcor/theme-<client>/tokens.css';`. This is what actually loads the client's colours and fonts.
- **`apps/demo/src/app/[locale]/page.tsx`** — change the theme import and the object passed to `<SectionRenderer theme={…} …>` from `novalt` to your theme's exported name (for example `import { josoor } from '@nabcor/theme-josoor'`). `SectionRenderer` uses that theme to pick the right component for each section.

Install so the new workspace dependency links up:

```bash
npm install
```

### 3. Confirm the images are in place

Check that every image the content file points to actually exists under `apps/demo/public/media/`, in the right subfolder, with the exact name (capital letters matter). Paths in the content start at `/media/…`. Partner logos and portfolio photos are optional — if the client didn't send them, the content should not reference them.

### 4. See it run

```bash
npm run dev
```

Open both pages and look:

- English: <http://localhost:3000/en>
- Arabic: <http://localhost:3000/ar>

The Arabic page should read right-to-left, in the client's colours, with the client's logo and sections. If a section looks wrong, it's almost always the content file or an image path — fix and the page refreshes on save. Stop the dev server with **Ctrl + C** when you're done looking.

### 5. Run the content check and fix what it names

```bash
npm run validate-content
```

It reads the content file and, if anything is missing or wrong, prints the exact field in plain English (the most common miss is text that has only `en` or only `ar` — every human-readable field needs both). Fix each field it names, save, and run it again until it prints the valid check. **Nothing moves on until this is green.**

### 6. Build the production version

```bash
npm run build
```

This compiles everything, including the theme contract. If a type is off or the theme is missing a component, the build stops and names it. Fix and re-run until it finishes with no red **error** lines.

### 7. Run the accessibility gate (build first)

The accessibility test runs against the built site, so build in step 6 first, then:

```bash
npm run test:a11y
```

It loads both `/en` and `/ar` and scans them with axe. If a check fails, it names the page and the exact issue — an image missing its description, text with too little contrast, a heading out of order. Fix the underlying content or, if it's a theme problem (like a colour with weak contrast), fix it back in the theme (`tokens.css`) and re-run. (The first run may download a test browser once — that's normal.)

### 8. Fix issues at the right layer

When a gate fails, fix it where it belongs, not with a patch on top:

- **Missing or wrong text, wrong image path** → the **content** file.
- **Weak colour contrast, spacing, or a component's markup** → the **theme** package (then re-run `typecheck` and the a11y gate).
- **Wiring (wrong import, wrong theme object)** → the **app** files from steps 1–2.

Re-run the failing gate after each fix until all three (content, build, a11y) are green.

---

## Done-check

- [ ] The content file is in `apps/demo/src/content/` and every import that reads content points at it.
- [ ] `globals.css` imports `@nabcor/theme-<client>/tokens.css`, and `page.tsx` passes the client theme to `<SectionRenderer>`.
- [ ] `apps/demo/package.json` lists `@nabcor/theme-<client>` and `npm install` has linked it.
- [ ] Every image the content references exists under `public/media/` with an exact, convention-named path.
- [ ] `/en` and `/ar` both render locally in the client's brand, with Arabic right-to-left.
- [ ] `npm run validate-content` prints the valid check.
- [ ] `npm run build` finishes with no red **error** lines.
- [ ] `npm run test:a11y` passes on both `/en` and `/ar`.
