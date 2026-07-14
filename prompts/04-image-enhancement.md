# 04 · Image enhancement — match the brand, fill only the real gaps

A reusable prompt for an AI assistant. It takes the tidy image set from step 3 and makes it look like one coherent, on-brand collection: consistent color, clean crops, tidy logos. Then, and only where a needed image is genuinely missing, it generates a brand-consistent fill — while never inventing a photo that would misrepresent the client's real work, people, or partners.

**Before you start:** the images now under `apps/<client-slug>/public/media/`, the client's logo, the site's brand colors (its theme `tokens.css`), and the **Still missing** list from step 3's `IMAGE-DECISIONS.md`.

**How long:** about 20–45 minutes, depending on how many photos need work and how many gaps need filling.

**You'll know it worked:** opened side by side, the images read as one set — the same warmth, the same brand color feel, sensible crops — and every image slot the content file asked for is either a real corrected photo or an honestly-labeled brand fill. An `ENHANCEMENT-LOG.md` records every edit and every generated image.

> **This is step 4 of 4 — the last step before the site is built.** After this, run `npm run validate-content`, `npm run build`, and `npm run test:a11y` to confirm the site is green.

---

## Copy everything below into your AI assistant

You are polishing a client's site images to one brand-consistent look, then filling only the gaps that truly have no source. Correct real photos; do not fabricate evidence. A generated fill is fine when it is generic and clearly not a specific claim; a generated "photo" of a real project, a real person, or a partner's involvement is not — leave those out and flag them instead.

### Inputs

- The classified images under `apps/<client-slug>/public/media/`.
- The client's logo (in `media/brand/`) and the site's `tokens.css` brand colors.
- The **Still missing** list from step 3.

### Outputs

1. Color-corrected, sensibly-cropped images in `public/media/` (edit copies; keep the step-3 versions recoverable).
2. Any genuinely-needed **fills**, generated brand-consistent and named to the convention.
3. `ENHANCEMENT-LOG.md` — the record described in step 6.

### Steps

1. **Read the brand's colors first.** Look at the client's logo and the theme's `tokens.css`. The tokens name the palette semantically — the primary brand color lives in aliases like `--color-brand-500`, with lighter and darker steps around it, on neutral surfaces. That palette is your target: nudge photos *toward* the brand feel; do not paint everything a single hue.

2. **Correct each real photo.** For every kept photo, use your image-editing tools to: fix white balance and color temperature, set exposure and contrast, recover blown highlights, and straighten a tilted horizon. Aim for natural and consistent across the set — the goal is that they look shot on the same day, not heavily filtered. Do not over-saturate, and do not tint every image the brand color.

3. **Crop to each bucket's shape.** Cut each image to the proportion its slot wants — a wide crop for `hero/`, a balanced tile for `services/`, a landscape card for `portfolio/`, an upright portrait for `team/`. Keep the subject centered and uncropped. These are sensible defaults; the theme's components do the final framing in the browser, so you only need clean, well-composed source.

4. **Tidy the brand and partner marks.** Put logos on clean or transparent backgrounds, trim stray edges, and make sure `favicon.png` reads clearly at small sizes.

5. **Fill only the genuine gaps — carefully.** Take the **Still missing** list and split it in two:
   - **Safe to generate** — generic, non-specific, brand-consistent imagery: an abstract or textural `hero-primary.jpg` when the client gave no hero, or a neutral placeholder tile for a service with no photo. Generate these to match the brand palette, and name them to the convention.
   - **Never generate** — anything that would assert something untrue: a fake `project-<NN>-…` photo of work they may not have done, a `person-…` portrait of someone who doesn't exist, or a partner logo they didn't supply. `portfolio` images and `partners` logos are **optional in the schema** precisely so you can leave them out. Leave them out, and flag them for the client to send real ones.

6. **Write `ENHANCEMENT-LOG.md`.** For a non-developer:
   - **Corrected** — each photo and what you adjusted (in plain words: "warmed up, straightened, cropped to wide").
   - **Generated fills** — each image you created, marked clearly as generated, and why it was safe (generic/abstract).
   - **Left out on purpose** — each missing project/person/partner image you refused to fake, with a one-line note to request the real file.

7. **Confirm the site is green.** Once images are in place, run the site's own guards:

   ```bash
   npm run validate-content
   npm run build
   npm run test:a11y
   ```

### Done-check

- [ ] The images read as one consistent set — coherent color, comparable brightness, sensible crops.
- [ ] Colors sit within the brand's palette without every image being tinted one flat hue.
- [ ] No fabricated photo of a real project, real person, or partner exists anywhere.
- [ ] Every generated fill is generic, brand-consistent, correctly named, and logged as generated.
- [ ] Every slot from step 2 is now either a real corrected image or an honestly-left gap noted for follow-up.
- [ ] `ENHANCEMENT-LOG.md` exists with the three groups above.

---

## Josoor reality check

Josoor's photos were mixed-lighting phone shots of insulation work — perfect for color correction and straightening, and easy to unify toward the site's brand palette. But they gave no hero image and thin project coverage. So you'd likely **generate one abstract, on-brand `hero-primary.jpg`** (safe: it claims nothing) and **leave most `portfolio` project slots empty**, flagging them for real photos rather than inventing bridges they may not have built. Partners were names only, so there are no partner logos to enhance — and you must not manufacture any.

## Hand-off

- With images done and the three guards passing, the site is ready to preview (`npm run dev`, then open `/en` and `/ar`) and to deploy per `docs/` and the deploy templates in `packages/core/deploy/`.
