# Build a theme

This guide is for a **designer** making a new nabcor theme by cloning the reference theme, `theme-novalt`. You will end up with your own package — your colors, your type, your spacing — that any nabcor site can switch to as a build-time dependency.

**Before you start, you need:**

- The nabcor repo cloned, opened in your editor, with `npm install` already run once at the root.
- Node 20+ and npm 10+ (check with `node -v` and `npm -v`).
- Your brand basics decided: a color ramp (light to dark), a primary color, one display font, one body font, and — if you serve Arabic — one Arabic font.
- A name for your theme in lowercase, no spaces. This guide uses **`marine`** as the running example. Everywhere you see `marine`, use your own name.

**How long it takes:** about 60–90 minutes for a first pass. Recoloring is fast; adjusting the nine components to your taste is the slow part.

**How you'll know it worked:** these four commands, run from the repo root, all finish without errors, and the site at `/en` and `/ar` shows your colors:

```bash
npm run typecheck
npm run build
npm run test:a11y
npm run dev
```

---

## The big picture: what a theme actually is

nabcor separates a site into three layers. A **theme** is the middle one.

1. **Content** — the words and images, typed in a `content.ts` file. Not your job.
2. **Theme** — how those words look: colors, fonts, spacing, and one component per kind of section. **This is what you build.**
3. **Layout** — the Next.js app that glues content and theme together. Not your job.

A theme is just a small package with two things inside:

- **`tokens.css`** — every color, spacing step, radius, and font, defined once.
- **Nine React components** — one for each kind of section a site can have (hero, stats, services, and so on).

The reference theme, `theme-novalt`, is a complete working example of both. You are going to copy it and change its values, not build from a blank page.

---

## The one rule the compiler enforces: totality

There are nine kinds of section. A theme must supply a component for **every one of them**. If you forget even one, the build fails — on purpose.

This is the whole safety net. In `packages/core/src/contracts/theme.ts`, the theme's `components` field is typed as "a component for every section type":

```ts
// You cannot assign this object unless it has ALL nine keys.
export type SectionComponents = {
  [T in SectionType]: SectionComponent<T>;
};
```

So if your `theme.config.ts` lists only eight components, `npm run typecheck` and `npm run build` stop with a clear error naming the missing one. There is no runtime registry to forget to fill in, and no way to ship a half-finished theme by accident. **That compile error is the feature.**

The nine section types you must cover:

| Section type | What it is |
| --- | --- |
| `hero` | The big opening banner |
| `stats` | A row of numbers ("150+ projects") |
| `services` | What the business offers |
| `process` | A 4-stage "how we work" narrative |
| `portfolio` | Past client projects |
| `partners` | Partner or client names (logos optional) |
| `testimonial` | Customer quotes |
| `faq` | Questions and answers |
| `contact` | Contact details plus a form |

---

## The token layering law

All of your visual decisions live in **`tokens.css`**, and they are stacked in three layers. **Never skip a layer.**

### Layer 1 — the raw palette (in the `@theme` block)

This is your brand's raw color ramp, from lightest to darkest, plus your fonts. In Novalt it is a violet ramp:

```css
@theme {
  --color-violet-50: #f6f4ff;
  --color-violet-500: #7c47f0;
  --color-violet-950: #1b0940;
  /* ...and the steps in between... */

  --font-display: var(--font-fraunces, 'Fraunces'), Georgia, serif;
  --font-sans: var(--font-inter, 'Inter'), system-ui, sans-serif;
  --font-arabic: var(--font-noto-kufi, 'Noto Kufi Arabic'), var(--font-sans);
}
```

**Rule: a component may never use these raw values directly.** They are the paint tin, not the wall.

### Layer 2 — the semantic aliases (in `:root`)

This layer gives each raw color a *job*. "Which violet is the primary button?" "Which is the page background?" This is the only place the two layers meet:

```css
:root {
  --color-brand-500: var(--color-violet-600); /* the primary */
  --color-on-brand: #ffffff;                  /* text on the primary */
  --color-surface-1: #ffffff;                 /* page background */
  --color-text-primary: var(--color-ink);
  --color-border: rgba(22, 12, 51, 0.1);
  /* spacing, radius, motion also live here */
}
```

### Layer 3 — the components use *only* the semantic aliases

Every component reads `var(--color-brand-500)`, `var(--space-4)`, `var(--radius-soft)` — never `var(--color-violet-600)`. The stylesheet even marks the line below which raw colors are forbidden:

```css
/* Component-level classes. Consume SEMANTIC aliases only —
   a raw --color-violet-* must never appear below this line. */
```

**Why this matters to you:** when you want to recolor the whole theme, you change the ramp in Layer 1 and the mapping in Layer 2 — a dozen lines in one file — and every component updates for free. If a component had reached past the aliases to grab a raw violet, your recolor would silently miss it and you'd chase a stray color for an hour.

### The fixed scales (keep these names; change only the values if you must)

Spacing uses a fixed 8-step scale. Do not invent `--space-9`; pick from these:

```css
--space-1: 4px;   --space-2: 8px;   --space-3: 16px;  --space-4: 24px;
--space-5: 32px;  --space-6: 48px;  --space-7: 64px;  --space-8: 96px;
```

Radius has exactly three roles:

```css
--radius-sharp: 4px;   --radius-soft: 16px;   --radius-pill: 9999px;
```

Using the same eight spacing steps and three radii across every component is what makes a theme feel like one design instead of nine.

---

## The recipe system: one section, several looks

Some sections can be drawn more than one way. A hero can be centered text, or split with an image on the right or left, or a full-bleed video. Services can be a 3-up grid, a 2-up grid, or a plain list. These variations are called **recipes**.

Here is how it fits together:

- The **content** file picks a recipe for each section (for example, `recipe: 'split-image-right'`).
- Your **theme** declares which recipes it actually draws, in `supportedRecipes`.
- If content asks for a recipe your theme does *not* support, nabcor quietly falls back to the **first recipe you declared** — so the page still renders instead of breaking.

Novalt supports all of them:

```ts
supportedRecipes: {
  hero: ['centered-text', 'split-image-right', 'split-image-left', 'fullbleed-video'],
  services: ['grid-3up', 'grid-2up', 'list'],
},
```

**You do not have to support them all.** A minimal theme can declare just one hero recipe:

```ts
supportedRecipes: {
  hero: ['centered-text'],   // every hero renders centered, whatever content asked for
  services: ['grid-3up'],
},
```

If you support fewer recipes than the schema allows, coerce the request down to something you can draw at the top of your component, using the helper from core:

```tsx
import { resolveHeroRecipe } from '@nabcor/core';
// requested is section.recipe; recipe is guaranteed to be one you support
const recipe = resolveHeroRecipe(theme, section.recipe);
```

There is a matching `resolveServicesRecipe`. In the Novalt `Hero` component you'll see it simply branch on `section.recipe` directly — that's fine *because Novalt supports every recipe*. If yours doesn't, resolve first, then branch.

---

## What each component receives

Every one of the nine components is a small React function with the same shape. It gets the section's data and the current locale, and returns markup:

```tsx
import type { SectionProps } from '@nabcor/core';
import { localized } from '@nabcor/core';

export function Services({ section, locale }: SectionProps<'services'>) {
  const heading = localized(section.heading, locale);
  // ...return JSX...
}
```

Two things you'll use constantly:

- **`section`** is fully typed for its slot. Inside `Services`, `section.items` exists; inside `Hero`, `section.headline` exists. Your editor will autocomplete the right fields.
- **`localized(text, locale)`** turns a bilingual `{ ar, en }` value into the right string for the current language. **Never** print `section.heading` directly — always `localized(section.heading, locale)`. Text can also be missing, in which case `localized` returns an empty string, so guard optional fields (`{heading && <h2>...}`).

---

## RTL is mandatory, not optional

Every nabcor site ships Arabic. When the language is Arabic, the entire layout must **mirror** — the design flips left-to-right into right-to-left. The app already sets the direction for you on the `<html>` element on the server, so the first paint is correct (no flicker). You inherit it. Your job is to write components that mirror **automatically**.

**Do this:**

- **Use logical CSS properties, never physical ones.** Say `margin-inline-start`, not `margin-left`. Say `padding-inline`, not `padding-left`/`padding-right`. Say `text-align: start`, not `text-align: left`. Logical properties flip on their own in RTL; physical ones do not. Novalt's `tokens.css` uses `padding-inline` and `margin-inline` throughout for exactly this reason.
- **Swap the font for Arabic.** Novalt does this in one place:

  ```css
  [dir='rtl'] .nv-body { font-family: var(--font-arabic); }
  ```

- **Mirror directional icons.** Arrows and chevrons that point "forward" must point the other way in RTL. Flip them with a rule like:

  ```css
  [dir='rtl'] .my-arrow { transform: scaleX(-1); }
  ```

  Non-directional icons (a checkmark, a star) must **not** flip.
- **Keep truly LTR content upright.** A phone number reads left-to-right even inside Arabic. Novalt's contact component wraps the number in its own `dir="ltr"` island so the digits don't scramble. Do the same for phone numbers, emails, and URLs.

**Don't do this:** hard-code `left`/`right`, absolutely position something to one physical edge, or assume the first grid column is on the left. Test the mirror by opening `/ar` in the browser — the whole page should feel like a clean reflection of `/en`, not a broken copy.

---

## Accessibility is a gate you must pass

There is an automated test — `npm run test:a11y` — that loads both `/en` and `/ar`, runs the axe accessibility scanner, and **fails the build if it finds any serious or critical problem.** It also checks that `lang` and `dir` are correct. Your theme has to clear this bar.

Practical rules while you design:

- **Use real HTML elements for their meaning.** One `<h1>` per page (the hero headline), an `<h2>` per section heading, `<h3>` for item titles. Lists are `<ul>`/`<ol>` with `<li>`. Don't fake a heading with a big styled `<div>`.
- **Hide decoration from screen readers.** The little icon squares, the process step numbers, a background hero image — mark them `aria-hidden="true"`, and give a decorative image an empty `alt=""`. Novalt does this everywhere.
- **Give meaningful images real alt text**, pulled from content: `alt={localized(media.alt, locale)}`.
- **Keep the focus ring.** The app draws a visible `:focus-visible` outline in `--color-brand-500`. Don't remove outlines in your CSS.
- **Check color contrast.** Body text on its background, and text on your primary color, must be legible. This is why Novalt's `--color-brand-500` maps to a *darker* violet (600) than the mid-ramp: it has enough contrast on white. When you pick your primary, verify it against white text before committing.

---

## Step-by-step: clone Novalt into your theme

Run everything from the repo root. Replace `marine` with your theme's name.

### 1. Copy the reference theme

```bash
cp -R packages/theme-novalt packages/theme-marine
```

You now have a full, working copy. Everything below is editing it.

### 2. Rename the package

Open `packages/theme-marine/package.json`. Change the `name` and `description`:

```json
{
  "name": "@nabcor/theme-marine",
  "version": "0.1.0",
  "description": "Marine — a nabcor theme.",
  ...
}
```

Leave everything else in that file alone. The `exports`, `sideEffects`, and `peerDependencies` are already correct. Note there is **no build step** for a theme — the package ships its TypeScript source directly, so your edits take effect immediately.

### 3. Recolor and re-type `tokens.css`

Open `packages/theme-marine/src/tokens.css`. Work top to bottom:

- **Layer 1 (`@theme`):** replace the `--color-violet-*` ramp with your own ramp. You can rename them (`--color-marine-500`) or keep the neutral names — your choice, as long as Layer 2 points at them. Replace the three `--font-*` values with your fonts.
- **Layer 2 (`:root`):** re-point each semantic alias at the right step of your new ramp. Set `--color-brand-500` to your primary. Adjust surfaces, text colors, borders, and the footer colors to suit.
- **Leave the scales alone** unless you have a real reason: keep the eight `--space-*` steps and the three `--radius-*` roles.
- **Layer 3 (the component classes at the bottom):** these mostly stay as-is because they already read only semantic aliases. Tweak them for your look (button padding, card style, heading sizes), but **never paste a raw color value in here** — always go through an alias.

If you renamed the raw ramp, do a quick search for the old name (`violet`) in the file to make sure nothing raw leaked into Layer 3.

### 4. Wire up `theme.config.ts`

Open `packages/theme-marine/src/theme.config.ts`. Change the identity fields and the tokens path, and rename the exported constant:

```ts
export const marine: NabcorTheme = {
  id: 'marine',
  displayName: 'Marine',
  tokensPath: '@nabcor/theme-marine/tokens.css',
  supportedRecipes: {
    hero: ['centered-text', 'split-image-right', 'split-image-left', 'fullbleed-video'],
    services: ['grid-3up', 'grid-2up', 'list'],
  },
  components: {
    hero: Hero,
    stats: Stats,
    services: Services,
    process: Process,
    portfolio: Portfolio,
    partners: Partners,
    testimonial: Testimonial,
    faq: Faq,
    contact: Contact,
  },
};
```

Trim `supportedRecipes` if your theme draws fewer looks. **Keep all nine keys in `components`** — that's the totality rule.

### 5. Update the package's entry point

Open `packages/theme-marine/src/index.ts` and rename the export to match:

```ts
export { marine } from './theme.config';
export { marine as default } from './theme.config';
```

### 6. Adjust the components

The nine component files live in `packages/theme-marine/src/components/`. They already work. Restyle them to your taste — but as you edit, keep every rule from this guide: semantic aliases only, logical CSS properties, `localized()` for all text, semantic HTML, `aria-hidden` on decoration. If you dropped some recipes in step 4, add a `resolveHeroRecipe` / `resolveServicesRecipe` call at the top of the affected component. Replace or delete the sample images under `packages/theme-marine/assets/` if you shipped any; a real site's photos live in the app's `public/media/`, not in the theme.

### 7. Point the demo site at your theme

Three small edits in `apps/demo`:

**a. Add the dependency** in `apps/demo/package.json` (next to the existing `@nabcor/theme-novalt` line):

```json
"@nabcor/theme-marine": "*",
```

**b. Load your tokens** in `apps/demo/src/app/globals.css` — change the import:

```css
@import '@nabcor/theme-marine/tokens.css';
```

**c. Use your theme** in `apps/demo/src/app/[locale]/page.tsx` — change the import and the `theme` prop:

```tsx
import { marine } from '@nabcor/theme-marine';
// ...
<SectionRenderer theme={marine} sections={content.sections} locale={locale} />
```

### 8. Link, check, and preview

```bash
npm install      # links your new workspace package
npm run typecheck
npm run build
npm run test:a11y
npm run dev      # open http://localhost:3000/en and /ar
```

If `typecheck` complains that a section component is missing, you dropped a key from `components` in step 4 — that's the totality rule catching you. Add it back.

---

## Definition of done for a theme

A theme is finished when **all** of these are true:

- [ ] The package is renamed: `packages/theme-<name>/package.json` has the `@nabcor/theme-<name>` name.
- [ ] `theme.config.ts` sets `id`, `displayName`, and `tokensPath` to your theme, and exports the constant under your name (re-exported from `index.ts`).
- [ ] **All nine** components are present in `components` — `npm run typecheck` passes with no missing-key error.
- [ ] `tokens.css` respects the three layers: raw palette in `@theme`, semantic aliases in `:root`, and **no raw color value anywhere in the component classes**.
- [ ] Components reference **only** semantic aliases (`--color-brand-*`, `--space-*`, `--radius-*`), never raw ramp colors.
- [ ] The eight-step spacing scale and the three radius roles are used consistently.
- [ ] `supportedRecipes` matches what the components actually draw; any unsupported recipe is coerced with `resolveHeroRecipe` / `resolveServicesRecipe`.
- [ ] All text goes through `localized(...)`; optional text is guarded so nothing renders an empty tag.
- [ ] **RTL mirrors correctly**: logical CSS properties only, the Arabic font swaps in, directional icons flip, and LTR content (phones, emails, URLs) stays upright. `/ar` looks like a clean reflection of `/en`.
- [ ] Accessibility passes: one `<h1>`, ordered headings, semantic lists, decoration marked `aria-hidden`, meaningful images have `alt`, the focus ring is intact, and contrast is legible.
- [ ] `npm run typecheck`, `npm run build`, and `npm run test:a11y` all pass.
- [ ] The demo renders your theme at both `/en` and `/ar` with your colors, fonts, and spacing.
