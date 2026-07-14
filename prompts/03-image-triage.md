# 03 · Image triage — classify, dedupe, and rename the photos

A reusable prompt for an AI assistant. It takes the pile of raw phone photos and logo files from step 1 and turns it into a tidy, correctly-named set of images sitting in the right folders — one clear picture per job, no camera-default names, no duplicates.

**Before you start:** the `20-images/` folder from step 1, the client slug, and the site's app folder `apps/<client-slug>/`. It also helps to have the image "shopping list" from step 2 (the `/media/…` paths the content file referenced).

**How long:** about 20–40 minutes for a couple dozen photos.

**You'll know it worked:** the images the site actually needs live under `apps/<client-slug>/public/media/`, each in the right sub-folder with a name that says what it is (like `hero/hero-primary.jpg` or `portfolio/project-01-riyadh-bridge.jpg`), and there is an `IMAGE-DECISIONS.md` that records every rename and every duplicate you dropped.

> **This is step 3 of 4.** It consumes the *images* pile from step 1. It does **not** touch the *reference* screenshots (a site they liked) — those never become images on the client's site.

---

## The naming convention (this is the whole point)

Every image lives in a folder named for its role, with a kebab-case name that repeats that role. The full set of folders and name patterns:

```
apps/<client-slug>/public/media/
├─ brand/       logo.svg   logo-mark.svg   favicon.png
├─ hero/        hero-primary.jpg
├─ services/    service-<slug>.jpg          e.g. service-thermal-insulation.jpg
├─ portfolio/   project-<NN>-<slug>.jpg     e.g. project-01-riyadh-bridge.jpg
├─ partners/    partner-<slug>.png          (often empty — partners are text only)
└─ team/        person-<slug>.jpg           e.g. person-omar-al-fahad.jpg
```

**The rules, always:**

- **kebab-case only** — lowercase, words joined by hyphens.
- **no spaces** anywhere in a name.
- **no camera-default names** — `IMG_9113.png` and `PHOTO-2026-07-10-22-44-38 2.jpg` are both forbidden.
- **the path encodes the role** — you can tell what an image is for from where it sits and what it's called.
- **`<NN>` is zero-padded** — `project-01-…`, `project-02-…`, so they sort in order.

---

## Copy everything below into your AI assistant

You are classifying, de-duplicating, and renaming a client's raw images into the nabcor media convention. Rename **copies** into `public/media/`; leave the originals in `20-images/` untouched so the work is reversible. When you cannot confidently place an image, park it and flag it — never force it into a folder or invent a new one.

### Inputs

- The `20-images/` folder from step 1.
- The client slug and app folder `apps/<client-slug>/`.
- The image shopping list from step 2's `MISSING-FIELDS.md` (which slots the content file expects).

### Outputs

1. Correctly-named images under `apps/<client-slug>/public/media/<bucket>/`.
2. `apps/<client-slug>/public/media/_holding/` — any survivor you could not confidently classify.
3. `IMAGE-DECISIONS.md` — the log described in step 6.

### Steps

1. **Look at every image and note its facts.** For each file in `20-images/`, record its pixel dimensions, file size, format, and one line describing what it shows ("logo on white," "finished bridge joint," "team of five outdoors"). You need dimensions because they decide duplicates.

2. **Group the near-duplicates and keep only the sharpest.** WhatsApp and iPhone bundles are full of the same shot saved twice — a `"… 2.jpg"` copy, a re-sent lower-res version, a burst of near-identical frames. Group those, then **keep the single highest-resolution variant** and set the rest aside. Write down which you dropped and why.

3. **Classify each survivor into one bucket:**
   - **`brand/`** — logo files. An SVG logo stays `logo.svg`; a simplified icon version is `logo-mark.svg`; a small square icon is `favicon.png`.
   - **`hero/`** — the single strongest, widest image to open the page → `hero-primary.jpg`.
   - **`services/`** — one clear photo per service, named to match that service's `slug` from the content file → `service-<slug>.jpg`.
   - **`portfolio/`** — photos of completed projects → `project-<NN>-<slug>.jpg`, numbered in the order the content file lists them.
   - **`partners/`** — only if a real partner logo was actually supplied → `partner-<slug>.png`. Usually this stays **empty**, because partners arrive as names only.
   - **`team/`** — head-and-shoulders photos of named people → `person-<slug>.jpg`.

4. **Rename copies into place, following the convention exactly.** kebab-case, no spaces, no camera names, zero-padded numbers, role in the path. Match `service-<slug>` and `project-<NN>` to the slugs and order already used in the content file so the paths line up.

5. **Handle formats.** iPhone `.heic` photos need converting to `.jpg` (note it in the log so step 4 knows). SVG logos stay SVG. Keep the highest-quality source you have; do not upscale here — that's step 4's call.

6. **Write `IMAGE-DECISIONS.md`.** A non-developer should be able to follow it:
   - **Renames** — an old-name → new-path table for every image you kept.
   - **Dropped duplicates** — each discarded file, the one it duplicated, and why (usually "lower resolution").
   - **Holding** — every image in `_holding/` and why you couldn't place it.
   - **Still missing** — every slot the content file asked for that you had no source for (very often the hero and most portfolio photos). This is the list step 4 will try to fill.

### Done-check

- [ ] No camera-default names survive (no `IMG_*`, no `PHOTO-…`, nothing with a space).
- [ ] Every kept image sits in a named bucket with a convention-correct name.
- [ ] For every set of duplicates, exactly one — the highest-resolution — was kept.
- [ ] Reference screenshots from step 1 were **not** used; they are not site images.
- [ ] `IMAGE-DECISIONS.md` records every rename, every dropped duplicate, and every still-missing slot.

---

## Josoor reality check

Josoor sent **~20 unnamed WhatsApp/iPhone photos** with names like `IMG_9113.png`, plus numbered duplicates like `PHOTO-2026-07-10-22-44-38 2.jpg`. So most of your effort is duplicate-hunting (keep the sharpest of each pair) and inventing honest slugs from what the photo shows, since the filenames tell you nothing. Their partners came as **text only**, so `partners/` stays empty — that's correct, not a gap. And expect the **hero and several portfolio slots to have no usable source**: list them under "Still missing" and let step 4 decide what to do.

## Hand-off

- The images now in `public/media/` and the **Still missing** list → **`04-image-enhancement.md`** (color-correct the real photos to the brand, and fill only the genuine gaps).
