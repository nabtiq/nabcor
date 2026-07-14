# Install a site (from clone to live)

This is the main guide. It takes you from an empty folder to a working website you can see in your browser, edit, and put online. You do **not** need to be a developer. Copy each command, paste it into your terminal, and press Enter.

---

## Before you start

You need three things on your computer:

1. **Node.js, version 20 or newer.** This is the engine the site runs on. Check what you have:

   ```bash
   node --version
   ```

   If it prints `v20.` or higher (like `v20.11.0` or `v22.3.0`), you're good. If it prints a lower number, or "command not found", install the current **LTS** version from [nodejs.org](https://nodejs.org). Installing Node also installs npm.

2. **npm, version 10 or newer.** It comes with Node. Check it:

   ```bash
   npm --version
   ```

   If it prints `10.` or higher, you're good.

3. **A terminal.** On a Mac, open the app called **Terminal**. On Windows, open **PowerShell** or **Windows Terminal**. Every command below goes here.

You also need **git** to download the code. Check with `git --version`. If it's missing, install it from [git-scm.com](https://git-scm.com).

## How long this takes

About **15 to 20 minutes** the first time. The longest single step is `npm install`, which downloads everything the site needs (a few minutes on a normal connection). After the first time, starting the site again takes seconds.

## How you'll know it worked

When you finish the first few steps, your browser will show the **Novalt** demo site — a violet, editorial company page — at **http://localhost:3000/en** (English) and **http://localhost:3000/ar** (Arabic, right-to-left). That's the signal everything is wired up correctly. From there, you swap in your own words and images.

---

## Step 1 — Get the code

Pick a folder where you keep projects, then download nabcor into it:

```bash
git clone https://github.com/nabtiq/nabcor.git
cd nabcor
```

You are now inside the project folder. Every command from here runs from this folder unless it says otherwise.

## Step 2 — Install

This downloads everything the site depends on. Run it once:

```bash
npm install
```

It prints a lot of text and takes a few minutes. When it stops and hands you back the prompt with no red **error** lines, it's done. A few yellow "warn" lines are normal — ignore them.

## Step 3 — Start the site

```bash
npm run dev
```

This starts a local server on your own machine. Leave this window running — the site is live only while this command is running. You'll see a line like:

```
▲ Next.js 15.5.0
- Local:  http://localhost:3000
```

To stop the server later, click this terminal window and press **Ctrl + C**.

## Step 4 — Open it in your browser

Open your web browser and go to:

- **http://localhost:3000/en** — the English site
- **http://localhost:3000/ar** — the Arabic site

The Arabic version flips to right-to-left automatically — the menus, text, and layout all mirror. You didn't do anything special for that; the site sets the language and direction for you.

**This is your success check.** If you see the Novalt page in both languages, the install worked. If you see a blank page instead, jump to [Troubleshooting](#troubleshooting).

---

## Step 5 — Change the words

All the words on the site — the company name, the tagline, every section — live in **one file**:

```
apps/demo/src/content/novalt.ts
```

Open that file in any text editor (even the plain **TextEdit** or **Notepad**, though something like [VS Code](https://code.visualstudio.com) is nicer). You don't need to understand the code around it. You're only changing the text inside the quotation marks.

**One rule to remember:** every piece of human-readable text is written twice — once for English (`en`) and once for Arabic (`ar`). Always change both.

Near the top you'll find the business details. To rename the company and change its tagline, edit the parts in quotes:

```ts
business: {
  name: { en: 'Novalt', ar: 'نوفالت' },
  tagline: {
    en: 'Software that compounds — product engineering for teams that ship.',
    ar: 'برمجيات تُراكم القيمة — هندسة منتجات للفرق التي تُطلق بثقة.',
  },
```

Change `'Novalt'` to your company's English name and `'نوفالت'` to its Arabic name. Do the same for the tagline. Save the file.

**You do not need to restart anything.** The moment you save, the browser updates on its own. Flip back to http://localhost:3000/en and you'll see the new name.

Further down in the same file is a list called `sections` — that's the hero banner, the services, the stats, the client projects, the contact block, and so on, in the order they appear on the page. Each one is a block with `en` and `ar` text you can edit the same way. Change the text, save, and watch the browser update.

> Tip: change one thing at a time and save. If the page ever shows an error after a save, it's almost always a small typo — a missing comma or a missing quotation mark. Undo your last change (Ctrl + Z / Cmd + Z), save again, and it recovers.

## Step 6 — Add your images

Your pictures go in one place, organized into folders by what they're for:

```
apps/demo/public/media/
```

Inside are folders like `brand/` (your logo), `hero/` (the big banner image), `services/`, `portfolio/` (project photos), and `partners/`. **The file names matter** — they can't have spaces, and camera-default names like `IMG_9113.png` or `PHOTO-2026-07-10-22-44-38 2.jpg` are not allowed. Each file is renamed to say what it is, like `hero-primary.jpg` or `project-01-riverside.jpg`.

The full naming rules, folder by folder, are in a short companion guide:

**→ [image-naming-convention.md](./image-naming-convention.md)** — read this before you drop in photos.

Once a file is named correctly and sitting in the right folder, point to it from the content file using a path that starts at `/media/...` — for example `'/media/hero/hero-primary.jpg'`. The demo content already shows this pattern.

## Step 7 — Check your content is valid

Before you build or publish, run the content checker. It reads your content file and, if anything is missing or wrong, tells you in plain English exactly what to fix:

```bash
npm run validate-content
```

When everything is correct, it prints:

```
✓ novalt: content is valid.
```

If something is wrong — say you deleted the Arabic version of the tagline by accident — it lists the problems and refuses to pass:

```
✗ novalt: 1 problem(s) found:

  - business.tagline: missing Arabic (ar) text

Fix the fields above, then re-run. Nothing ships until this passes.
```

Open `apps/demo/src/content/novalt.ts`, find the field it named, fix it, save, and run the command again until you see the green check.

Want to see the checker catch a broken file on purpose? Run this — it validates a deliberately broken sample and shows you what failure looks like, without touching your real content:

```bash
npm run validate-content -- broken
```

## Step 8 — Build the production version

The dev server from Step 3 is for editing. When you're happy with the site, build the real, optimized version:

```bash
npm run build
```

This checks the whole site and packages it for the web. When it finishes without red **error** lines, your site is ready to ship. If the build stops with an error, read the last few lines — it usually names the file and the problem. Content mistakes are caught earlier by Step 7, so run that first.

## Step 9 — Run the accessibility check

nabcor ships with an automated gate that makes sure the site is usable by people with screen readers and other assistive tools. It loads both the English and Arabic pages and scans them for problems.

It runs against the built site, so **build first** (Step 8), then run:

```bash
npm run test:a11y
```

You'll see a list of checks. When they all pass, the site meets the accessibility bar. If a check fails, it names the page and the specific issue (for example, an image missing its description or text with too little contrast) so you know what to adjust.

> The very first time you run this, it may download a browser it uses for testing. That's normal and only happens once.

## Step 10 — Put it online

Deployment ships the site to a real server on a web address. nabcor comes with ready-made templates for this — you don't write them from scratch. They live in:

```
packages/core/deploy/
```

That folder contains:

- **`Dockerfile`** — packages the site into a standard, portable image.
- **`docker-compose.traefik.yml.template`** — runs the site on the shared VPS behind the Traefik router (which handles the domain and HTTPS certificate automatically).
- **`deploy.yml.template`** — a GitHub Actions workflow that ships new changes to the server over SSH whenever you push to `main`.

The step-by-step walkthrough — copying these templates, filling in your site name and domain, and setting the three server secrets — is in the deploy guide:

**→ [DEPLOY-PATTERN.md](./DEPLOY-PATTERN.md)**

Deployment is the one part that involves a server login, so follow that guide carefully and ask for help if a step is unclear.

---

## Troubleshooting

### The page is blank, or the browser can't connect

- Make sure the terminal from **Step 3** (`npm run dev`) is still running. The site is live only while that command runs. If you closed it, start it again.
- Check the web address. It must include the language: **http://localhost:3000/en** or **/ar**. Plain `http://localhost:3000` with nothing after it will not show the site.
- Look at the `npm run dev` terminal for a red error. If it names a file and a line, you likely have a typo in the content file — usually a missing comma or an unclosed quotation mark. Undo your last edit, save, and it recovers.

### "Port 3000 is already in use"

Something else is already using that address. Either close the other `npm run dev` window, or let this one pick the next free port — it will print a new address like `http://localhost:3001`. Use whatever address it prints.

### The content checker keeps failing

Read the bullet list it prints. Each line names the exact field — like `business.tagline` or a section — and what's wrong. The most common cause is text that has only English or only Arabic. Every human-readable field needs **both** `en` and `ar`. Fix the named field in `apps/demo/src/content/novalt.ts`, save, and run `npm run validate-content` again.

### An image isn't showing up

- Check the file name. No spaces, and no camera names like `IMG_9113.png`. See [image-naming-convention.md](./image-naming-convention.md).
- Check the folder. Logos go in `media/brand/`, the banner in `media/hero/`, and so on.
- Check the path in the content file. It starts at `/media/` — for example `'/media/hero/hero-primary.jpg'` — and must match the real file name exactly, including capital letters.

### "command not found" for node, npm, or git

The tool isn't installed, or the terminal can't find it. Install Node from [nodejs.org](https://nodejs.org) (it includes npm) and git from [git-scm.com](https://git-scm.com), then close and reopen your terminal so it picks them up.

### `npm install` finished with warnings

Yellow **warn** lines are safe to ignore. Only red **error** lines mean it failed. If it did fail, the most common fix is to check your Node version (`node --version` must be 20 or higher), then run `npm install` again.

---

## The commands, all in one place

Run all of these from inside the `nabcor` folder:

```bash
npm install              # once, to download everything
npm run dev              # start the editable local site (Ctrl+C to stop)
npm run validate-content # check your content is complete and correct
npm run build            # build the production version
npm run test:a11y        # run the accessibility gate (build first)
```

Then open **http://localhost:3000/en** and **http://localhost:3000/ar** while `npm run dev` is running.

## Where to go next

- **Editing content in depth** — every section type and how to fill it in.
- **[image-naming-convention.md](./image-naming-convention.md)** — the rules for photo file names and folders.
- **[DEPLOY-PATTERN.md](./DEPLOY-PATTERN.md)** — putting the site on a live web address.
