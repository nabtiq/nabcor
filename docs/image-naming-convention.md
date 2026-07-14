# Image folder and naming convention

This is the one right way to organise the pictures for a nabcor site. Every image lives in a fixed folder, and every filename follows the same simple pattern. Do this once, at the start, and the rest of the build just works.

**Before you start, you need:**

- A folder of images from the client (logos, photos, screenshots — whatever they sent).
- The site folder you are working in. For the demo it is `apps/demo`. For a real client it is `apps/<site>` (for example `apps/josouralazl`).
- A file browser (Finder on Mac) or a terminal. Nothing to install.

**How long it takes:** About 15–30 minutes for a typical client folder of 20–40 images. Most of that time is looking at each photo and deciding what it actually is.

**How you will know it worked:** Every image sits under `public/media/` in the right sub-folder, every filename is lowercase-with-dashes and describes what the picture is, and there is not a single `IMG_...` or `Screenshot...` name left. When you later point the content file at an image, the picture shows up on the page instead of a broken box.

---

## Why this matters

Real clients do not send tidy files. The Josoor Al-Azel intake, for example, arrived as roughly twenty unnamed WhatsApp and iPhone photos with camera names like `IMG_9113.png`, duplicate copies like `PHOTO-2026-07-10-22-44-38 2.jpg`, a 63 MB print PDF, and two screenshots of a website they liked. None of it told you what any picture was for.

A name like `IMG_9113.png` is useless six weeks later. A name like `project-02-warehouse-insulation.jpg` tells you — and the next person, and the site itself — exactly what it is and where it belongs. That is the whole idea: **the filename and its folder carry the meaning.**

---

## The folder tree

Every site keeps its images here, and only here:

```
apps/<site>/public/media/
├── brand/
│   ├── logo.svg          # the main logo
│   ├── logo-mark.svg     # the compact logo / icon-only version
│   └── favicon.png       # the little browser-tab icon
├── hero/
│   └── hero-primary.jpg  # the big picture at the top of the page
├── services/
│   ├── service-product-engineering.jpg
│   ├── service-platform.jpg
│   └── service-design-systems.jpg
├── portfolio/
│   ├── project-01-meridian-health.jpg
│   ├── project-02-kite-logistics.jpg
│   └── project-03-aria-fintech.jpg
├── partners/
│   ├── partner-vercel.png
│   └── partner-supabase.png
└── team/
    ├── person-lina-hassan.jpg
    └── person-omar-nasr.jpg
```

### Create the empty folders in one step

Copy this and paste it into your terminal. Replace `demo` with your site name if it is not the demo. It makes all six folders at once (it will not harm folders that already exist):

```bash
mkdir -p apps/demo/public/media/{brand,hero,services,portfolio,partners,team}
```

### What goes in each folder

| Folder | What lives here | Example filename |
| --- | --- | --- |
| `brand/` | Logos and the tab icon | `logo.svg`, `logo-mark.svg`, `favicon.png` |
| `hero/` | The big banner image at the top of the page | `hero-primary.jpg` |
| `services/` | One picture per service you offer | `service-platform.jpg` |
| `portfolio/` | One picture per client project | `project-01-meridian-health.jpg` |
| `partners/` | A partner or client logo (only if they sent one) | `partner-vercel.png` |
| `team/` | One head-shot per team member | `person-lina-hassan.jpg` |

A note on file types: use the extension that matches the real file. Photos are usually `.jpg`. Logos and icons are usually `.svg` or `.png`. The example names above show the common case — keep the pattern, match the actual format.

---

## The five rules

1. **Use lowercase with dashes (kebab-case).** Every filename is all lowercase, and words are joined by a single dash. `hero-primary.jpg` — yes. `Hero_Primary.JPG` — no.

2. **No spaces, ever.** Spaces break links and cause silent failures on the server. Replace every space with a dash.

3. **No camera-default names.** These are forbidden and must be renamed before the build:
   - `IMG_9113.png` — a camera name, means nothing.
   - `PHOTO-2026-07-10-22-44-38 2.jpg` — a camera name **and** it has a space **and** the trailing `2` marks it as a duplicate. All three problems.
   - Also rename: `WhatsApp Image ...`, `Screenshot ...`, `DSC_0421.JPG`, `Untitled.png`, and anything with a phone or camera pattern.

4. **Keep only the highest-resolution copy of a duplicate.** Clients often send the same photo two or three times (`... 2.jpg`, `... copy.jpg`). Open them, keep the largest / sharpest one, delete the rest, and give the survivor a proper name.

5. **Put the meaning in the path.** Anyone should be able to read the folder plus the filename and know what the picture is and where it belongs — without opening it. `portfolio/project-02-warehouse-insulation.jpg` already tells the whole story.

---

## Before and after: renaming a messy client folder

This is what the work actually looks like. Left column is what the client sent; right column is where it ends up. (The `<site>` stands in for your site folder, e.g. `josouralazl`.)

| What the client sent (messy) | What it becomes (convention) |
| --- | --- |
| `IMG_9113.png` (their logo) | `apps/<site>/public/media/brand/logo.svg` |
| `logo final FINAL v2.png` | `apps/<site>/public/media/brand/logo-mark.svg` |
| `favicon copy.png` | `apps/<site>/public/media/brand/favicon.png` |
| `PHOTO-2026-07-10-22-44-38.jpg` (front of building) | `apps/<site>/public/media/hero/hero-primary.jpg` |
| `PHOTO-2026-07-10-22-44-38 2.jpg` (same photo, duplicate) | *delete — keep only the sharpest copy* |
| `WhatsApp Image 2026-07-10 at 22.44.38.jpeg` (a job site) | `apps/<site>/public/media/services/service-thermal-insulation.jpg` |
| `IMG_9207.png` (a finished roof) | `apps/<site>/public/media/portfolio/project-01-marina-towers.jpg` |
| `IMG_9208.png` (warehouse job) | `apps/<site>/public/media/portfolio/project-02-warehouse-insulation.jpg` |
| `Screenshot 2026-07-10 at 3.14.png` (a site they liked) | *not a project photo — do not publish it; keep it out of `media/`* |
| `partner sabic logo.png` | `apps/<site>/public/media/partners/partner-sabic.png` |
| `omar headshot.JPG` | `apps/<site>/public/media/team/person-omar-nasr.jpg` |

Two things to notice. First, a screenshot of a website the client *liked* is a reference for you, not content for their site — it never goes into `media/`. Second, the duplicate photo is deleted, not renamed; you keep one copy and one copy only.

---

## How a filename connects to the content file

The pictures on the page are chosen in the content file (`apps/<site>/src/content/<site>.ts`). In that file you write the image as a web path that always starts with `/media/...`. That path points straight at the matching file on disk, because Next.js serves everything inside `public/` from the site root.

So `/media/hero/hero-primary.jpg` in the content file **is** the file at `apps/<site>/public/media/hero/hero-primary.jpg`. Same path, minus the `public/` part. Get the filename right on disk and the content path right, and the two line up.

Here is how each part of the content maps to a file:

| Where it appears in the content file | The path you write | The file it points to |
| --- | --- | --- |
| `business.logo` | `/media/brand/logo.svg` | `public/media/brand/logo.svg` |
| `seo.ogImage` (the share preview) | `/media/hero/hero-primary.jpg` | `public/media/hero/hero-primary.jpg` |
| A hero section's `media.src` | `/media/hero/hero-primary.jpg` | `public/media/hero/hero-primary.jpg` |
| A services item with `slug: 'platform'` | `/media/services/service-platform.jpg` | `public/media/services/service-platform.jpg` |
| The 1st portfolio project (client "Meridian Health") | `/media/portfolio/project-01-meridian-health.jpg` | `public/media/portfolio/project-01-meridian-health.jpg` |
| A partner logo (only if they sent one) | `/media/partners/partner-vercel.png` | `public/media/partners/partner-vercel.png` |
| A team member's photo | `/media/team/person-lina-hassan.jpg` | `public/media/team/person-lina-hassan.jpg` |

A few tips that make the naming automatic:

- **Services:** each service in the content has a `slug` (like `platform` or `product-engineering`). Name its image `service-<slug>.jpg` and it will always match.
- **Portfolio:** number the projects in the order they appear — `project-01-...`, `project-02-...`, `project-03-...` — and add a short dash-separated version of the client name. The two-digit number keeps them in order in the folder.
- **Partners:** a partner logo is **optional**. Real clients often send partner names as text only, with no logo. That is fine — if there is no logo file, just leave it out; the partners section still works with names alone.
- **Team:** name each head-shot `person-<firstname>-<lastname>.jpg`.

---

## Pre-build checklist

Run through this before you build the site. If every box is ticked, the media folder is ready.

- [ ] Every image lives under `apps/<site>/public/media/` and nowhere else.
- [ ] It is in the right sub-folder: `brand`, `hero`, `services`, `portfolio`, `partners`, or `team`.
- [ ] Every filename is lowercase with dashes. No capital letters, no underscores.
- [ ] No filename contains a space.
- [ ] There is not a single camera name left — no `IMG_...`, no `PHOTO-...`, no `DSC_...`, no `Screenshot...`, no `WhatsApp Image...`, no `Untitled`.
- [ ] Duplicates are resolved: one copy kept (the sharpest / largest), the rest deleted.
- [ ] Reference screenshots ("a site they liked") are **not** in `media/` — they are not content.
- [ ] Service images match their content `slug`: `service-<slug>.jpg`.
- [ ] Portfolio images are numbered in order: `project-01-...`, `project-02-...`, and so on.
- [ ] Team head-shots are named `person-<name>.jpg`.
- [ ] `brand/` has at least the main logo.
- [ ] Every `/media/...` path in the content file points at a file that actually exists.

### A quick way to catch leftover bad names

From the repo root, this lists any file under a site's `media` folder that still has a forbidden name (a space, or a camera-style prefix). If it prints nothing, you are clean:

```bash
find apps/*/public/media -type f \( -name '* *' -o -iname 'IMG_*' -o -iname 'PHOTO-*' -o -iname 'DSC_*' -o -iname 'Screenshot*' -o -iname 'WhatsApp*' -o -iname 'Untitled*' \)
```

When that command shows nothing and the checklist above is fully ticked, your images are ready for `npm run build`.
