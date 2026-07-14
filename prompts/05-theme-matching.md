# Pipeline 05 — Theme matching (screenshot → theme + recipes + client report)

This is a reusable prompt for one stage of the nabcor build pipeline. Run it after the client's content has been gathered, and before you build a theme (stage 06). Its job is to look at the reference screenshot(s) the client sent — the site or look they "like" — and decide which **existing nabcor theme** and which **section recipes** get closest to that taste, then write a short, honest report the client can read.

**This stage never copies the client's reference.** You are choosing from nabcor's own themes and explaining, in plain words, what will feel similar and what will be different on purpose. You are not recreating someone else's website.

---

## Before you start

You need:

1. **The client's reference screenshot(s)** — the images they sent of a site or design they like. (For the worked example, Josoor Al-Azel sent two screenshots of a website they liked.)
2. **The list of nabcor themes.** Look in `packages/theme-*`. Today there is one: `@nabcor/theme-novalt` — a violet, editorial look. More may be added over time; match against whatever is there.
3. **The recipe list for each theme.** Open the theme's `src/theme.config.ts` and read its `supportedRecipes`. For Novalt today:
   - **hero:** `centered-text`, `split-image-right`, `split-image-left`, `fullbleed-video`
   - **services:** `grid-3up`, `grid-2up`, `list`
   - Other section types have one fixed look each (for example, **process** is always a 4-stage vertical).

## How long this takes

About **20 to 30 minutes**. Most of it is looking carefully at the screenshot and writing clearly.

## How you'll know it worked

You finish with two things: a **theme + recipe map** (which theme, and which recipe for each section) that stage 06 and 07 can act on, and a **one-page similarity / difference report** written for the client in plain language. When both exist and the report is honest about what will differ, this stage is done.

---

## Inputs

- Client reference screenshot(s).
- The available themes under `packages/theme-*` and their `supportedRecipes`.
- The client's section list (which sections their site will have: hero, stats, services, process, portfolio, partners, testimonial, faq, contact).

## Outputs

- **A theme choice** — the single nabcor theme that fits best (or a clear note that none fit and a new theme is warranted).
- **A recipe map** — for each section the client will have, the chosen recipe (where the section offers a choice).
- **A client-facing similarity / difference report** (Markdown) — what will feel like their reference, and what will be different on purpose, and why.

---

## Steps

### 1. Read the screenshot for its *taste*, not its pixels

Look at the reference and note, in plain words:

- **Colour temperature** — warm or cool? Dark or light? One strong colour or many?
- **Layout density** — lots of white space and few big elements, or tightly packed?
- **Type feel** — serif and editorial, or clean and technical? Big headlines or modest ones?
- **Imagery** — full-bleed photos, boxed photos, or mostly text and icons?
- **Section order and rhythm** — what comes first (a big image? a headline? stats?), and how the page flows.

Write these down as short notes. This is the language you'll match against the themes.

### 2. Compare those notes to each available theme

For each theme in `packages/theme-*`, open its `tokens.css` and skim its components. Ask: does this theme's mood (colour, spacing, type) sit near the client's notes, or far from them? Novalt, for instance, is **violet, editorial, generous spacing, serif display headings** — a great fit for a modern, premium, tech-or-design feel, and a weaker fit for, say, a heavy industrial or construction look.

Pick the **closest** theme. If nothing is close, that is a valid finding — record it and flag that a new theme may be needed (stage 06 can still start from the closest theme as a base and re-colour it).

### 3. Map each section to a recipe

Go section by section through the client's list. For each section that offers a choice, pick the recipe that matches the reference:

- **Hero** — a big centred headline over colour → `centered-text`; a headline beside a photo → `split-image-right` or `split-image-left`; a moving background → `fullbleed-video`.
- **Services** — three cards across → `grid-3up`; two wider cards → `grid-2up`; a simple stacked list → `list`.
- Sections with one fixed look (process, portfolio, partners, testimonial, faq, stats, contact) don't need a recipe choice — just note that they'll use the theme's built-in look.

Remember: **partners** may be names only (no logos), and **portfolio** images are optional. If the client sent partner names as text, say so here so stage 06/07 don't wait for logos.

### 4. Write the similarity / difference report for the client

Keep it to about one page, in plain language the client can read without a developer. Use these headings:

- **What we're matching** — the parts of your reference we can echo: "a light, spacious layout with a big opening headline and one strong brand colour."
- **What will be different, and why** — the parts we will *not* copy, stated positively: "we'll use your own brand colour and logo, not the one in the screenshot," "your projects will show in our portfolio layout, which is cleaner on phones."
- **The theme we recommend** — name it, and one sentence on why.
- **Section-by-section** — a short line per section naming the recipe in plain words ("Hero: headline beside your main photo").

**Do not promise a pixel-for-pixel copy of the reference site.** Say clearly that nabcor gives them their *own* version built on a proven, accessible, bilingual foundation — similar in feel, not a clone.

### 5. Hand off

Save the theme choice and recipe map somewhere stage 06 and 07 can read them (for example, alongside the intake notes). Send the report to the client and, if the schema supports it, capture the recipe choices where the content file's sections can reference them.

---

## Done-check

- [ ] The screenshot's taste is captured as short written notes (colour, density, type, imagery, order).
- [ ] One theme from `packages/theme-*` is chosen — or it's clearly flagged that none fit and why.
- [ ] Every section that offers a choice has a recipe, using only recipes listed in that theme's `supportedRecipes`.
- [ ] Partner-names-only and optional portfolio images are noted, so later stages don't wait on assets that won't arrive.
- [ ] A one-page client report exists with **What we're matching** and **What will be different, and why**.
- [ ] The report makes no promise to copy the client's reference site. It offers *their own* version, similar in feel.
