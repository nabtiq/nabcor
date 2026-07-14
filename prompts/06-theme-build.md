# Pipeline 06 — Theme build (clone the starter, apply the client's brand)

This is a reusable prompt for one stage of the nabcor build pipeline. Run it after stage 05 has chosen a theme and mapped the recipes. Its job is to turn nabcor's reference theme into **the client's own theme package** by cloning the starter and swapping in the client's colours, fonts, and brand feel — without breaking the theme contract.

The deep, field-by-field guide for editing a theme lives in **[`docs/build-a-theme.md`](../docs/build-a-theme.md)**. This prompt is the checklist that drives it.

---

## Before you start

You need:

1. **The theme choice from stage 05** — which existing theme is the base (today that's `@nabcor/theme-novalt`).
2. **The client's brand basics:**
   - Their **main brand colour** (a hex value, ideally, or their logo to read the colour from).
   - Their **logo files** (a full logo and, if they have one, a compact "mark").
   - Their **fonts**, if they have brand fonts. If not, the starter's fonts are a safe default.
3. **A short client name in lowercase, no spaces** — used for the package, e.g. `josoor`.

## How long this takes

About **30 to 45 minutes** for a colour-and-font retheme. Longer only if the client wants brand-new section layouts.

## How you'll know it worked

You'll have a new folder `packages/theme-<client>` that builds cleanly. Running `npm run typecheck` from the project root passes with no errors — that green result is the proof that the theme still provides **every** section component the contract requires.

---

## Inputs

- The chosen base theme under `packages/theme-*`.
- The client's brand colour(s), logo/mark files, and fonts.
- The short client name (lowercase).

## Outputs

- **A new theme package** `packages/theme-<client>` (`@nabcor/theme-<client>`) with:
  - a `tokens.css` re-coloured to the client's brand, keeping the two-layer structure,
  - the client's fonts wired in,
  - the client's brand assets in `assets/`,
  - `theme.config.ts` exporting a theme object that still names every section component.

---

## Steps

### 1. Copy the starter to a new package

From the project root, copy the reference theme to a new folder named for the client:

```bash
cp -R packages/theme-novalt packages/theme-<client>
```

Replace `<client>` with the short lowercase name (for example `packages/theme-josoor`).

### 2. Rename the package

Open `packages/theme-<client>/package.json` and change the `name` from `@nabcor/theme-novalt` to `@nabcor/theme-<client>`. Update the `description` to the client's look in a few words ("warm, solid, industrial" — whatever fits). Leave the `exports`, `dependencies`, and `peerDependencies` as they are.

### 3. Re-colour `tokens.css` — keep the two layers

Open `packages/theme-<client>/src/tokens.css`. It has **two layers on purpose**, and you keep both:

- **Layer 1 — the raw ramp** (inside the `@theme { … }` block). This is the client's brand colour spread from very light to very dark (50 → 950). Replace the starter's violet ramp with the client's colour at the same light-to-dark steps. Components never touch these directly.
- **Layer 2 — the semantic aliases** (inside `:root { … }`). These are the names the components actually use — `--color-brand-500` (the primary), surfaces, text, border, footer. Point each alias at the right step of your new ramp. In most rethemes you only change which ramp step each alias points to; the alias names stay the same.

Do **not** rename or delete any semantic alias, and do **not** hard-code raw colours in components. That separation is what lets a colour swap stay this simple.

Leave the **spacing scale** (`4 · 8 · 16 · 24 · 32 · 48 · 64 · 96`) and the **radii** (`--radius-sharp` 4px, `--radius-soft` 16px, pill) alone unless the client's look genuinely calls for sharper or softer corners. If it does, change the radius values — not the component code.

### 4. Set the fonts

Still in `tokens.css`, find the type variables: `--font-display`, `--font-sans`, and `--font-arabic`. If the client has brand fonts, point these at them (keeping a system-font fallback at the end of each line). If not, leave the starter's fonts — they're a solid, bilingual default (a serif display, a clean sans, and an Arabic face). Always keep an Arabic font in `--font-arabic`; every nabcor site is bilingual.

### 5. Drop in the brand assets

Put the client's logo and any imagery into `packages/theme-<client>/assets/`, following nabcor's naming rules (kebab-case, no spaces, no camera names like `IMG_9113.png`). The starter ships example assets — replace them with the client's, keeping clear names like `brandmark.png` and `hero-primary.png`. (Site-specific photos that belong to *one* site live in that app's `public/media/`, not in the theme; the theme's `assets/` are for brand pieces the theme itself ships.)

### 6. Carry over the recipe map from stage 05

Open `packages/theme-<client>/src/theme.config.ts`. Set `id` and `displayName` to the client. Confirm `supportedRecipes` lists the recipes stage 05 chose (hero and services recipes). Most rethemes keep the same recipes the starter supports; only trim or add if the client's design truly needs it and the component supports it.

### 7. Do **not** remove any component

The `components` map in `theme.config.ts` names one component per section type (hero, stats, services, process, portfolio, partners, testimonial, faq, contact). This map must stay **complete**. Leaving one out is not a shortcut — it's a build failure. That is the whole point of the contract: a theme that's missing a component cannot ship.

### 8. Prove it builds

From the project root:

```bash
npm install
```

```bash
npm run typecheck
```

`typecheck` is the real test here. If the theme is missing a component or a type is wrong, it fails and names the problem. When it passes with no errors, the theme is contract-complete.

---

## Done-check

- [ ] `packages/theme-<client>` exists and its `package.json` `name` is `@nabcor/theme-<client>`.
- [ ] `tokens.css` still has **both** layers: a raw ramp in `@theme` and semantic aliases in `:root`. No component hard-codes a raw colour.
- [ ] The client's brand colour drives `--color-brand-500` (the primary), and surfaces/text/footer read correctly against it.
- [ ] `--font-arabic` still points at an Arabic font; every type variable has a fallback.
- [ ] The client's logo/brand assets are in `assets/` with clean, kebab-case names.
- [ ] `theme.config.ts` still names **every** section component — none removed.
- [ ] `npm run typecheck` passes from the project root with no errors.
