# 02 · Content extraction — documents into a draft content file

A reusable prompt for an AI assistant. It reads the client's documents (the brochure `.docx`, the company-profile PDF) and produces two things: a **draft `content.ts`** in the shape nabcor expects, and an honest **missing-fields report** that lists every blank, every guess, and every translation that still needs a human's eyes.

**Before you start:** the `10-text/` folder from step 1, the client slug, and the site's app folder (a copy of `apps/demo` renamed to `apps/<client-slug>`). You also need the plain facts you already know from the client — their real name, phone, email, and which languages the site ships (at least Arabic and English).

**How long:** about 30–60 minutes, depending on how much copy the documents hold.

**You'll know it worked:** there is a `content.ts` at `apps/<client-slug>/src/content/<client-slug>.ts`, and a `MISSING-FIELDS.md` beside your working notes that a non-developer can read and act on. When you run `npm run validate-content`, it either passes or prints only problems that are also written up in the report.

> **This is step 2 of 4.** It consumes the *text* pile from step 1. It does **not** touch images — it only references image paths that step 3 will fill in.

---

## The shape you are filling in

nabcor content is one typed object called `SiteContent`. Every piece of human-readable text is written **twice** — `{ ar: "…", en: "…" }` — because every site is at least bilingual. The object has five parts:

- **`business`** — `name` and `tagline` (both required, both languages), and optional `logo`, `email`, `phone`, `whatsapp`, `address`, and `social` links.
- **`locales`** — the list of languages, e.g. `['ar', 'en']`.
- **`defaultLocale`** — one of those languages, shown when no language is chosen.
- **`seo`** — `siteUrl` (a full `https://…` address, required), plus optional `ogImage` and `index`.
- **`sections`** — the page, top to bottom, as a list. Each section has a `type` and its own fields:

| `type` | Holds | Key fields |
| --- | --- | --- |
| `hero` | the opening banner | `recipe` (`centered-text` / `split-image-right` / `split-image-left` / `fullbleed-video`), `headline`, optional `eyebrow`, `subheadline`, `cta`, `secondaryCta`, `media` |
| `stats` | headline numbers | `items[]` of `{ value, label }` |
| `services` | what they offer | `recipe` (`grid-3up` / `grid-2up` / `list`), `items[]` of `{ slug, title, description }` |
| `process` | how they work | `stages[]` of `{ step, title, body }` (the reference theme shows four) |
| `portfolio` | past projects | `projects[]` of `{ client, description, image? }` — **image is optional** |
| `partners` | who they work with | `partners[]` of `{ name, logo? }` — **logo is optional** |
| `testimonial` | quotes | `quotes[]` of `{ quote, author, role? }` |
| `faq` | questions | `items[]` of `{ q, a }` |
| `contact` | how to reach them | optional `phone`, `email`, `address`, `whatsapp` |

Every section may also carry an optional `agentSummary` (`{ ar, en }`) — one machine-readable sentence describing the section. Add it when you can; it feeds the site's `llms.txt`.

---

## Copy everything below into your AI assistant

You are turning a client's documents into a draft nabcor content file. Be faithful to what the documents actually say. Never invent a fact — no made-up phone number, no imagined statistic, no fictional testimonial. Where something is missing, leave the field out (if optional) or mark it clearly, and always record it in the report.

### Inputs

- The `10-text/` folder from step 1 (the `.docx`, the PDF, any other copy).
- The client slug and the app folder `apps/<client-slug>/`.
- Known facts from the client: real name, contact details, the language list.

### Outputs

1. `apps/<client-slug>/src/content/<client-slug>.ts` — the draft content object, typed as `SiteContent`.
2. `MISSING-FIELDS.md` — the report described in step 8.

### Steps

1. **Read the documents in full.** The brochure `.docx` is usually laid out as printed *pages*, with the Arabic line and the English line sitting right next to each other. Un-weave them: for each idea, pair the Arabic text with its matching English text, so each becomes one `{ ar, en }` value. Read the whole PDF too, but you do not need it at print resolution.

2. **Fill `business`.** Name and tagline are required in both languages — pull the tagline from the document's headline or "about us" line. Add `email`, `phone`, `whatsapp` (digits only, no `+` or spaces), `address`, and `social` links only when the client actually provided them. Set `logo: '/media/brand/logo.svg'` if a logo is expected (step 3 places the file); if unsure, leave it out and note it.

3. **Set `locales`, `defaultLocale`, and `seo`.** Locales are at least `['ar', 'en']`. `defaultLocale` must be one of them. `seo.siteUrl` must be a full `https://…` address — if you don't have the final domain yet, use a sensible placeholder like `https://<client-slug>.example` and flag it in the report.

4. **Turn the copy into `sections`, in the order the site should read.** A typical order is `hero → services → stats → process → portfolio → partners → testimonial → faq → contact`. Only include a section when the documents give you real material for it. Map what you find:
   - Headline / slogan → `hero` (`headline`, `subheadline`, an `eyebrow` if there's a short label).
   - Their list of offerings → `services` (`grid-3up` is a safe default; give each a short lowercase `slug`).
   - Any "our latest projects" / "our work" block → `portfolio`. Leave `image` off each project — real intake rarely includes usable project photos, and the field is optional by design.
   - Named partners or clients (often **text only, no logos**) → `partners`, each `{ name }` with **no** `logo`.
   - Numbers they boast (years, projects, clients) → `stats`.
   - Their method or phases → `process`.
   - Real client quotes → `testimonial`. Do not write quotes they did not say.

5. **Handle language gaps honestly.** Every text field needs both `ar` and `en`, and neither may be blank — the validator rejects empty strings. When a document gives only one language, write a faithful draft translation for the other **and record it in the report** as "translated, needs a native check." Never leave a required field blank, and never pass off a machine translation as client-approved.

6. **Add `agentSummary` where you can.** One short `{ ar, en }` sentence per section, describing what that section is about.

7. **Validate.** Wire your file in as the site's content and run:

   ```bash
   npm run validate-content
   ```

   It prints problems in plain language, for example `Missing: business.tagline.en — this field is required.`, `Empty: sections.0.headline.ar — this text cannot be blank.`, `Invalid URL: seo.siteUrl — include https://.`, or `Empty list: sections.2.items — add at least 1 item.` Fix what you can from the documents; put everything you cannot fix into the report. To see the guard in action on purpose, run `npm run validate-content -- broken`.

8. **Write `MISSING-FIELDS.md`.** Group it so a non-developer can chase the client:
   - **Facts we don't have** — required fields with no source (missing tagline, no real phone, placeholder `siteUrl`, etc.).
   - **Language needs review** — every field where you drafted a translation rather than using the client's own words.
   - **Placeholder copy** — any section where you had to write filler to make it valid.
   - **Images referenced but not yet present** — every `media`/`image`/`logo` path you wrote that step 3 still has to produce.

### Done-check

- [ ] `apps/<client-slug>/src/content/<client-slug>.ts` exists and is typed `SiteContent`.
- [ ] Every human-text field has both `ar` and `en`, and none is blank.
- [ ] Every section is backed by something the documents actually said (no invented facts or quotes).
- [ ] `npm run validate-content` passes, or every remaining problem is written up in the report.
- [ ] `MISSING-FIELDS.md` exists with the four groups above.

---

## Josoor reality check

Josoor Al-Azel sent no structured data at all — just a brochure `.docx` with Arabic and English interleaved line by line, and a 63 MB profile PDF. That is exactly the shape this prompt is built for: un-weave the two languages into `{ ar, en }` pairs, and read the PDF for anything the brochure left out. Their profile had an **"Our latest projects"** block → that becomes a `portfolio` section (with `image` left off each project). Their **partners arrived as names only, no logos** → a `partners` section of `{ name }` entries. Expect to translate several fields and to flag a placeholder `siteUrl` — that's normal, so record it and move on.

## Hand-off

- The image paths you referenced (`/media/hero/…`, `/media/services/…`, `/media/brand/…`) are the shopping list for **`03-image-triage.md`**.
- `MISSING-FIELDS.md` is a live checklist — the client fills the blanks, and steps 03–04 close out the missing images.
