# Client Intake Protocol

**The 6-step way to turn a client's messy pile of files into a website you can actually build.**

---

**Before you start, you need:**

- The raw files the client sent you (PDFs, Word documents, photos, screenshots), all in one folder.
- A copy of the nabcor repo on your computer, with `npm install` already run once.
- About **half a day** for a typical small business. Most of that is sorting photos and writing text, not waiting on the computer.

**How long it takes:** 3 to 5 hours of hands-on work for a normal client. A client who sends clean, named files can be done in an hour. The Josoor Al-Azel intake below took most of a day because nothing was labelled.

**How you'll know it worked:** the very last step ends with this line in your terminal:

```
✓ novalt: content is valid.
```

When you see that green check, the content is complete and correctly shaped, and the site is ready to build. Until you see it, you are not done — and neither is the client.

---

## Why this protocol exists

Real clients do not send you a tidy spreadsheet. They send you whatever is on their phone and their designer's laptop.

Everything in this document is based on one real intake: **Josoor Al-Azel (Insulation Bridges)**. Here is exactly what they sent us, and it is a good picture of what "normal" looks like:

- A **63 MB PDF** "company profile" — print resolution, far too heavy for the web, with all the real text trapped inside it.
- A **Word (.docx) document** laid out as brochure *pages*, with Arabic and English written on alternating lines, line by line, all the way down.
- Around **20 photos** straight off WhatsApp and an iPhone, with camera-default names like `IMG_9113.png` and duplicate copies like `PHOTO-2026-07-10-22-44-38 2.jpg`.
- **Two screenshots** of another company's website they said they liked.
- A list of **partner companies as plain text** — names only, no logos.
- An **"Our latest projects"** section in the profile, listing past jobs.

That is it. No structured data. No image names. No colour codes. This protocol is how you get from that pile to a finished, validated content file without losing your mind or inventing things the client never said.

> **Two facts to keep in your back pocket the whole way through.** In the nabcor content schema, a partner's logo (`partners[].logo`) and a project's photo (`portfolio[].image`) are **both optional**. That is not an accident or a loose end — the schema was designed that way *because of this exact client*. Josoor sent partner names with no logos and project stories with no usable photos. You are allowed to ship both. Never hold up a launch waiting for a logo the client does not have.

---

## The pipeline at a glance

Six steps, in order. Each one has a matching prompt in the `prompts/` folder so you never have to remember the details from memory.

| Step | What it does | Prompt |
|---|---|---|
| 1 | **Triage** — sort the pile by file type and name pattern | `prompts/01` |
| 2 | **Extract text** — turn documents into a draft `content.ts` plus a list of what's missing | `prompts/02` |
| 3 | **Sort & dedupe images** — pick the real photos, throw out the duplicates | `prompts/03` |
| 4 | **Retouch** — colour-correct the survivors so they match the theme | `prompts/04` |
| 5 | **Match the reference** — map the client's "I like this site" to a theme recipe we already have | `prompts/05` |
| 6 | **Validate & bounce** — run the check, send the gaps back to the client, wait | `prompts/06` |

After step 6 passes, you hand off to the build and deploy prompts (`prompts/07` and `prompts/08`). Those are a separate job. **Do not start building until step 6 is green.**

Do the steps in order. Step 2 depends on the sorting you did in step 1. Step 6 depends on everything. Skipping ahead is how blank taglines and dead contact forms end up live.

---

## Step 1 — Triage the files

> Prompt: `prompts/01`

**Inputs:** the single folder of raw files the client sent, exactly as they sent it. Do not rename anything yet.

**What you do:**

Sort every file into one of five buckets, by what it *is*, not by its name:

1. **Text sources** — anything with words in it. The 63 MB PDF, the brochure `.docx`. These feed Step 2.
2. **Photos** — real photographs of work, sites, teams, products. The ~20 WhatsApp and iPhone images. These feed Step 3.
3. **Reference screenshots** — pictures of *other* websites the client likes. Josoor's two screenshots go here. These feed Step 5. **These are never used as content.** They are mood, not material.
4. **Brand assets** — a logo, an icon, a brand colour, a font file. Josoor sent none of these cleanly; most clients don't.
5. **Junk** — signatures, WhatsApp stickers, screenshots of text messages, blurry accidents. Set aside, do not delete.

Watch the **name patterns** as you sort — they tell you what a file is before you even open it:

- `IMG_9113.png`, `IMG_9114.png` → straight off a phone camera. A real photo, but unnamed. Bucket 2.
- `PHOTO-2026-07-10-22-44-38 2.jpg` → the ` 2` on the end means it is a **duplicate copy**. Bucket 2, but flag it for Step 3.
- Anything ending `.pdf` or `.docx` → Bucket 1.
- A file that is a photo *of a screen* → almost always Bucket 3 (a reference), not Bucket 2 (real content).

**Outputs:** five labelled folders (`text/`, `photos/`, `references/`, `brand/`, `junk/`). Nothing renamed, nothing thrown away. Just sorted.

**Done-check:** every single file the client sent now lives in exactly one bucket, and you can say out loud what each bucket is *for*. If a file could go in two buckets, you have not looked at it closely enough yet.

---

## Step 2 — Extract the text into a draft, and list what's missing

> Prompt: `prompts/02`

**Inputs:** the `text/` bucket from Step 1 — for Josoor, the 63 MB PDF and the brochure `.docx`.

**What you do:**

Read the documents and pull the words into a first draft of the site's content file: `apps/<site>/src/content/<site>.ts`. This file is the entire site's text. There is no separate CMS — the `.ts` file *is* the content.

Every piece of human-readable text is bilingual. It is written as a small pair:

```ts
tagline: {
  en: 'Insulation bridges that last a generation.',
  ar: 'جسور عزل تدوم لجيل كامل.',
}
```

The brochure `.docx` will help you here, because it already has the Arabic and English interleaved line by line. Your job is to *un-interleave* it: take the Arabic line and the English line that belong together and put them into one `{ ar, en }` pair. Go slowly. It is easy to pair the wrong two lines.

Drop the text into the right **section types**. You are matching the client's material to the shapes nabcor already has:

- The company intro and headline → a **hero** section.
- "We do X, Y, Z" → a **services** section.
- Numbers the client is proud of ("20 years", "500 projects") → a **stats** section.
- The **"Our latest projects"** block from Josoor's profile → a **portfolio** section.
- The partner names → a **partners** section.
- Phone, email, address → a **contact** section.

Where a section helps AI assistants understand the page, add a one-line `agentSummary` (also bilingual). That summary is optional, but when present it feeds the site's `llms.txt` file automatically. It is a nice-to-have, not a blocker.

As you go, keep a second list open: **the missing fields.** Every time the documents don't answer a question, write the question down. For Josoor that list included things like:

- No email address anywhere in the profile.
- No WhatsApp number (and WhatsApp must be **digits only**, e.g. `971501234567`).
- Partner names present, but **no logos** — fine, `logo` is optional, note it and move on.
- "Latest projects" described in words, but **no clean project photos** — fine, `image` is optional, note it and move on.
- The site's real web address (`seo.siteUrl`) — the client hadn't decided the domain yet.

**Outputs:** two things.

1. A **draft `content.ts`** — as complete as the documents allow, with real bilingual text in the right sections.
2. An explicit, written **"missing fields" list** — every gap, named in plain language, ready to send to the client in Step 6.

**Done-check:** you can point to where every sentence in the draft came from in the client's documents — you invented nothing — **and** every gap the documents left is written down on the missing list. A draft with no missing list is not finished; it just means you stopped noticing the gaps.

---

## Step 3 — Sort and dedupe the images

> Prompt: `prompts/03`

**Inputs:** the `photos/` bucket from Step 1 — Josoor's ~20 phone and WhatsApp images.

**What you do:**

First, **find the duplicates.** WhatsApp and iPhones create copies constantly. You will see the same photo three times at three different sizes. The tell-tale signs are the ` 2`, ` 3` suffixes (`PHOTO-...-38 2.jpg`) and near-identical file sizes.

For each set of duplicates, **keep only the highest-resolution one.** Delete the smaller copies. A blurry 400-pixel WhatsApp copy is never the one you want when a 3000-pixel original sits right next to it.

Then **name the survivors** by their job on the site. This is the mandatory nabcor naming convention. The folder a file lives in and the name it carries must *say what it is*:

```
apps/<site>/public/media/
  brand/       logo.svg, logo-mark.svg, favicon.png
  hero/        hero-primary.jpg
  services/    service-<slug>.jpg
  portfolio/   project-<NN>-<slug>.jpg
  partners/    partner-<slug>.png
  team/        person-<slug>.jpg
```

The naming rules are strict, and they are not suggestions:

- **kebab-case only** — lowercase words joined by hyphens.
- **No spaces**, ever.
- **No camera-default names.** `IMG_9113.png` is forbidden. `PHOTO-2026-07-10-22-44-38 2.jpg` is forbidden.
- Every file's role lives in its path. `IMG_9114.png` becomes something like `portfolio/project-03-warehouse-roof.jpg`.

So a photo of a finished roofing job stops being `IMG_9114.png` and becomes `public/media/portfolio/project-03-warehouse-roof.jpg`. Now anyone can tell what it is without opening it.

If a project or a partner has **no usable photo at all**, that is allowed. Leave the `image` or `logo` field out of the content file. The schema expects this. Do not go hunting for a stock photo to fill the hole.

**Outputs:** a clean `public/media/` folder with correctly named, deduplicated images, each in the right subfolder. No `IMG_` names. No duplicates. No spaces.

**Done-check:** run your eye down the folder. Not one filename contains `IMG_`, a space, or a trailing ` 2`. Every image's name tells you what it shows. And every photo that made the cut is the sharpest copy you had.

---

## Step 4 — Retouch the survivors to match the theme

> Prompt: `prompts/04`

**Inputs:** the clean, renamed images from Step 3.

**What you do:**

Phone photos are shot in mixed light. One is warm and yellow, the next is cold and blue, a third is too dark. On the page, side by side, that looks amateur. Your job is to make them look like they belong to one, calm, consistent site.

Colour-correct each image toward the **theme's tokens** — the colours the theme is actually built from. For the reference theme (Novalt), those live in `packages/theme-novalt/src/tokens.css`. The theme is built around:

- A **violet** brand family, with the primary brand colour (`--color-brand-500`) at a deep violet.
- **Cream and white** surfaces behind the content.
- Deep-ink text, never pure black.

So you nudge the images to sit comfortably next to that violet-and-cream world: even out the exposure so nothing is too dark, pull wild colour casts back toward neutral, and keep everything in the same tonal family. You are not painting the photos violet. You are removing the jarring differences so the eye glides down the page.

Also resize for the web. That 63 MB print PDF and the multi-megabyte phone photos are far too heavy. Export web-sized images so pages load fast.

**Outputs:** a set of retouched, web-weight images that look like one coherent set and sit naturally inside the theme's colours.

**Done-check:** put the finished images in a row. Nothing jumps out as too yellow, too blue, or too dark. They read as a single set from a single company — not a random phone camera roll.

---

## Step 5 — Match the client's reference to a theme recipe

> Prompt: `prompts/05`

**Inputs:** the `references/` bucket from Step 1 — Josoor's two screenshots of a site they liked.

**What you do:**

The client points at another website and says "make it like that." You are **not** going to copy that site. You are going to read what they actually liked about it — the *feel* — and match it to the closest layout nabcor already offers.

nabcor themes are built from a fixed set of **recipes** — pre-made layout variants for each section. For the hero section, the recipes are:

- `centered-text`
- `split-image-right`
- `split-image-left`
- `fullbleed-video`

For the services section, the recipes are:

- `grid-3up`
- `grid-2up`
- `list`

Look at the client's screenshot and ask: which recipe is nearest? A big photo on one side with text on the other → `split-image-right` or `split-image-left`. A bold centered headline with no photo → `centered-text`. Three service cards in a row → `grid-3up`.

Then write that choice into the content file, on the section itself:

```ts
{
  type: 'hero',
  id: 'hero',
  recipe: 'split-image-right',
  // ...
}
```

**Never build a one-off layout to imitate the screenshot pixel for pixel.** If the reference is genuinely far from every recipe, that is a conversation to have with the team about the theme — not a reason to hand-carve a custom page. The whole point of nabcor is that every site is built from the same tested pieces. A literal copy throws that away.

**Outputs:** a recipe chosen for each section that needs one, written into the draft `content.ts`, justified by what the client actually admired in their reference.

**Done-check:** for every section with a `recipe`, you can name the recipe and say in one sentence why it fits what the client pointed at. And you did not invent a single layout that isn't already in the theme.

---

## Step 6 — Validate, then bounce the gaps back to the client

> Prompt: `prompts/06`

**Inputs:** the draft `content.ts` from Steps 2 and 5, and the "missing fields" list from Step 2.

**What you do:**

Run the validator. From the repo root:

```bash
npm run validate-content
```

This checks your content file against the schema and prints problems in plain language a non-developer can act on. If anything is missing or malformed, it looks like this:

```
✗ novalt: 3 problem(s) found:

  - Missing: business.tagline.en — this field is required.
  - Invalid email: sections.9.email.
  - Invalid URL: seo.siteUrl — include https://.

Fix the fields above, then re-run. Nothing ships until this passes.
```

Every line points at exactly one field and tells you what's wrong. The common ones you will meet:

- **`Missing: ... — this field is required.`** — a required field is absent. Add it.
- **`Empty: ... — this text cannot be blank.`** — the field is there but empty. Fill it.
- **`Empty list: ... — add at least 1 item.`** — a section has no items (e.g. a services section with no services).
- **`Invalid email: ...`** — an email address isn't a real address.
- **`Invalid URL: ... — include https://.`** — usually `seo.siteUrl` is missing its `https://`.

Want to see what a failing run looks like without breaking your real file? There's a broken sample built in for exactly that:

```bash
npm run validate-content -- broken
```

Now, the important part. **Some of those gaps you cannot fix yourself** — because only the client knows the answer. The missing email. The real WhatsApp number. The final domain name. This is where the "missing fields" list from Step 2 comes back.

**Send the gaps back to the client in plain language, and wait for the answers before you build.** Turn the validator's field names into human questions:

> "We're almost ready. To finish your site we still need three things from you:
> 1. The best email address for people to contact you.
> 2. Your WhatsApp number (just the digits, e.g. 971501234567).
> 3. Which web address the site should live at.
> Send those over and we'll have it live shortly."

And remember what you do **not** need to ask for. You do **not** chase the client for partner logos or project photos they never had — those fields are optional by design. Asking for them anyway just delays the launch and annoys the client.

When the client replies, drop the answers into `content.ts` and run `npm run validate-content` again. Repeat until it passes.

**Outputs:** a `content.ts` that passes validation, and a clear, answered set of questions to the client for anything only they could provide.

**Done-check:** the terminal shows exactly this, with nothing above it:

```
✓ novalt: content is valid.
```

That green check is the whole point of the protocol. It means there are no silent gaps — no blank tagline waiting to ship, no contact form with nowhere to send. Only now do you hand off to the build (`prompts/07`) and deploy (`prompts/08`) prompts.

---

## The one rule that ties it all together

Throughout this whole process, you will be tempted to *invent* to fill a hole — a stock photo where the client has no project shot, a placeholder logo where a partner sent only a name, a made-up tagline because the brochure didn't have a snappy one.

Don't. The schema was shaped around a real client who sent partner names as text and project stories with no photos, which is why `partners[].logo` and `portfolio[].image` are optional in the first place. When the client gave you something, use it. When they didn't, either leave the optional field out or put it on the list and ask. The validator is there to make sure every gap is a *known* gap, handled on purpose — never a surprise that ships to the public.
