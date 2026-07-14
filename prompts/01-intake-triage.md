# 01 · Intake triage — sort a raw client ZIP

A reusable prompt for an AI assistant. It takes the messy bundle a client sends — one ZIP full of documents, phone photos, and random screenshots — and sorts every file into three clean piles: **text**, **images**, and **reference material**. Nothing is deleted, nothing is renamed yet. This is only sorting.

**Before you start:** the client's ZIP saved somewhere on the machine, and a short name for the client (a "slug" — lowercase, hyphens, no spaces, e.g. `josour-alazl`). The assistant needs permission to read files and run shell commands.

**How long:** about 10–20 minutes for a typical bundle (a few documents and a couple dozen photos).

**You'll know it worked:** every file from the ZIP now sits in exactly one of four folders under `intake/<client-slug>/`, and there is an `INVENTORY.md` that lists what was found, how many of each kind, and anything that looked odd.

> **This is step 1 of 4.** Step 2 (`02-content-extraction.md`) reads the *text* pile. Step 3 (`03-image-triage.md`) reads the *images* pile. The *reference material* pile is not fed into either — it only tells you which look-and-feel (theme) the client wants.

---

## Copy everything below into your AI assistant

You are triaging a raw client intake bundle for a new nabcor site. Your job on this pass is **only to sort**, never to edit, rename, translate, or throw anything away. When you are unsure, keep the file and flag it — do not guess.

### Inputs

- One client ZIP (or a folder of loose files the client sent).
- The client slug, e.g. `josour-alazl`.

### Outputs

A working folder with four buckets and one report:

```
intake/<client-slug>/
├─ 00-raw/         a byte-for-byte copy of everything, left untouched
├─ 10-text/        anything that carries WORDS (docs, PDFs, spreadsheets)
├─ 20-images/      the client's own photos and logos
├─ 30-reference/   "make it look like this" material (not the client's content)
├─ 40-unsorted/    anything you could not confidently place
└─ INVENTORY.md    the plain-language manifest described below
```

### Steps

1. **Make the workspace and keep an untouched copy.** Never sort inside the original download.

   ```bash
   mkdir -p intake/<client-slug>/{00-raw,10-text,20-images,30-reference,40-unsorted}
   ```

   Unzip (or copy) the client bundle into `00-raw/`. From here on you only ever **copy** files out of `00-raw/` into a bucket — the raw copy stays complete so you can always start over.

2. **List everything first.** Walk `00-raw/` and record, for each file: its name, its type, and its size. Do this before moving anything. Large files matter — a print-resolution PDF can be 60 MB or more; note it, and do not try to open or render the whole thing at full resolution just to classify it. The file's name and first page are enough.

3. **Sort each file into exactly one bucket** using these rules:

   - **`10-text/` — it carries words.** `.docx`, `.doc`, `.pdf`, `.txt`, `.md`, `.rtf`, `.pages`, and spreadsheets or slide decks that hold copy or contact lists. A "company profile" PDF belongs here even when it is huge and print-resolution — it is where the client's actual words live.
   - **`20-images/` — the client's own pictures.** `.jpg`, `.jpeg`, `.png`, `.heic`, `.webp`, `.svg`, `.tiff`, `.gif`: photos of their work, their team, their site, and their logo files.
   - **`30-reference/` — design intent, not their content.** Screenshots of *other* websites they liked, mood boards, competitor brochures, "I want something like this" examples. These show the look they are after; they never become pictures on the client's site. When a screenshot clearly shows a different company's website, it goes here — not in `20-images/`.
   - **`40-unsorted/` — you cannot tell.** Fonts, videos, nested archives, empty files, password-protected or corrupt files, or anything genuinely ambiguous. Do not force it into a bucket; park it here and flag it.

4. **Do not resolve duplicates yet.** If you see the same photo twice, keep both. Deduplication happens in step 3 of the pipeline, where resolution can be compared properly.

5. **Write `INVENTORY.md`.** Plain language, for a non-developer. Include:
   - A count for each bucket (e.g. "3 documents, 24 images, 2 reference screenshots, 1 unsorted").
   - A one-line note for every item in `10-text/` (what document it is) and everything in `40-unsorted/` (why you could not place it).
   - A **Flags** section listing anything that needs a human: files over ~25 MB, password-protected or corrupt files, iPhone `.heic` photos that will need converting later, and screenshots you were unsure whether to call "the client's own" or "a site they liked".
   - A **Hand-off** line naming which bucket feeds which next step (below).

### Done-check

Before you finish, confirm all of these:

- [ ] `00-raw/` still contains a complete, untouched copy of the bundle.
- [ ] Every file appears in exactly one of the four buckets — none left loose, none in two places.
- [ ] No files were renamed, edited, translated, or deleted.
- [ ] `30-reference/` contains only material about *other* sites/looks, and `20-images/` contains only the *client's own* images.
- [ ] `INVENTORY.md` exists, has a count per bucket, and has a Flags section.

---

## Josoor reality check

The worked example is Josoor Al-Azel (insulation bridges). Their bundle looked like this, and yours will rhyme with it:

- A **63 MB print-resolution PDF** "company profile" → `10-text/` (it holds the words; just don't render it at full size to classify it).
- A **`.docx` laid out as brochure pages**, Arabic and English interleaved line by line → `10-text/`.
- **~20 unnamed WhatsApp / iPhone photos** with camera-default names like `IMG_9113.png`, plus duplicate numbered variants like `PHOTO-2026-07-10-22-44-38 2.jpg` → `20-images/` (keep every copy for now).
- **Two screenshots of a website they liked** → `30-reference/`, **not** `20-images/`. They are the look they want, not their own content.
- No structured data anywhere, and partner names sent as **text only, no logos** — that's expected. Nothing to sort into images for those.

## Hand-off

- `10-text/` → **`02-content-extraction.md`** (turn the documents into a draft content file).
- `20-images/` → **`03-image-triage.md`** (classify, dedupe, and rename the photos).
- `30-reference/` → informs which **theme** to start from; it is not an input to steps 02–04.
