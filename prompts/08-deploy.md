# Pipeline 08 — Deploy (build, ship over CI, verify the live site)

This is a reusable prompt for the final stage of the nabcor build pipeline. Run it after stage 07 — the site assembles, the content check is green, the build is clean, and the accessibility gate passes. Its job is to put the site on a real web address using nabcor's ready-made deploy templates, then confirm the live site actually works in both languages and serves its machine-readable files.

The full server walkthrough is **[`docs/DEPLOY-PATTERN.md`](../docs/DEPLOY-PATTERN.md)**. This prompt is the checklist that drives it. Everything here uses the templates already in the repo — you don't write deploy config from scratch.

> **Deployment touches a live server and secret keys.** Two steps are effectively irreversible: setting the repository secrets, and pushing to `main` (which triggers a live deploy). Read those steps before you run them, and if anything is unclear, stop and ask rather than guess.

---

## Before you start

You need:

1. **A site that passed stage 07** — green content check, clean build, passing a11y.
2. **The templates** in `packages/core/deploy/`:
   - `Dockerfile` — packages the site into a portable, standalone image.
   - `docker-compose.traefik.yml.template` — runs it on the shared VPS behind Traefik (which handles the domain and HTTPS certificate).
   - `deploy.yml.template` — a GitHub Actions workflow that ships to the server over SSH on every push to `main`.
3. **The client's domain** (for example `example.com`) — pointed at the shared VPS.
4. **Three server secrets**, added to the site's GitHub repo (Settings → Secrets and variables → Actions):
   - `DEPLOY_HOST` — the VPS IP or hostname.
   - `DEPLOY_USER` — the SSH user.
   - `DEPLOY_SSH_KEY` — a private key authorized for that user.
5. **A short site name in lowercase** (for example `josoor`) — used for the container and the server folder.

> Adding these secret keys and entering a server login is a person's job, done in GitHub and on the server — not something to automate away or paste into chat. Set them in the GitHub UI.

## How long this takes

About **30 to 60 minutes the first time** (mostly one-time setup: filling templates, adding secrets, first build on the server). Later deploys are automatic — you push, and CI does the rest in a few minutes.

## How you'll know it worked

The live site answers on the client's domain in **both** languages, over HTTPS, and serves its three machine-readable files. Concretely, all five of these load with no error:

- `https://<domain>/en`
- `https://<domain>/ar`
- `https://<domain>/robots.txt`
- `https://<domain>/sitemap.xml`
- `https://<domain>/llms.txt`

---

## Inputs

- The stage-07 site (assembled, validated, a11y-passing).
- The three deploy templates in `packages/core/deploy/`.
- The domain, the short site name, and the three GitHub secrets.

## Outputs

- The site's GitHub repo carries a filled-in compose file and a `.github/workflows/deploy.yml`.
- A running container on the shared VPS, reachable through Traefik on the client's domain over HTTPS.
- A verified live site: both locales plus `robots.txt`, `sitemap.xml`, and `llms.txt`.

---

## Steps

### 1. Do one last clean build locally

Catch problems on your machine, not on the server:

```bash
npm run build
```

It must finish with no red **error** lines. (If it doesn't, go back to stage 07 — do not deploy a build that fails locally.)

### 2. Copy the deploy files into the site repo

The `Dockerfile` is used as-is — its build context is the **monorepo root**, and it builds the `apps/demo` app by default (the clone-and-swap model keeps the app folder named `demo`, so the template works unchanged). Copy the workflow into place:

```bash
mkdir -p .github/workflows
cp packages/core/deploy/deploy.yml.template .github/workflows/deploy.yml
cp packages/core/deploy/docker-compose.traefik.yml.template docker-compose.traefik.yml
```

### 3. Fill in the placeholders

Open the two copied files and replace the `{{…}}` placeholders with the client's values:

- **`.github/workflows/deploy.yml`** — replace `{{SITE}}` with the short site name everywhere it appears (the workflow name, the concurrency group, and the `/docker/{{SITE}}/…` server paths).
- **`docker-compose.traefik.yml`** — replace:
  - `{{SITE}}` — the short site name (used for the container name, the Traefik router/service names, and the network).
  - `{{DOMAIN}}` — the client's domain (the template already also matches `www.` for you).
  - `{{DEFAULT_LOCALE}}` — the site's default language, `en` or `ar`. This is the path the container's health check pings, so it must be a real locale.

Don't publish host ports and don't touch Traefik itself — the template reaches the container on its internal port `3000`, so adding this site never disturbs any sibling site on the VPS.

### 4. Add the three secrets in GitHub

In the site's GitHub repository, go to **Settings → Secrets and variables → Actions** and add `DEPLOY_HOST`, `DEPLOY_USER`, and `DEPLOY_SSH_KEY` with the values for the shared VPS. The workflow reads these to copy the repo over and rebuild on the server. **Enter them in the GitHub UI** — never commit them to the repo or paste them into a file.

### 5. Deploy by pushing to `main`

The workflow runs on every push to `main` (and can also be started by hand from the Actions tab). Once the files are committed:

```bash
git add .github/workflows/deploy.yml docker-compose.traefik.yml
git commit -m "Add deploy workflow and compose for <site>"
git push origin main
```

**This push triggers a live deploy.** GitHub Actions copies the repo to `/docker/<site>/repo` on the VPS and runs `docker compose up -d --build`, which builds the standalone image and starts the container behind Traefik. Watch the run in the repo's **Actions** tab; open the job logs if it fails.

### 6. Let Traefik get the certificate

The first time the domain is served, Traefik requests an HTTPS certificate automatically (Let's Encrypt). Give it a minute. If the site loads on `http` but not `https` right away, wait and retry — and confirm the domain's DNS points at the VPS.

### 7. Verify the live site

Open each of these on the real domain and confirm it loads with no error:

- `https://<domain>/en` — English, left-to-right.
- `https://<domain>/ar` — Arabic, right-to-left.
- `https://<domain>/robots.txt` — the crawl rules (served by the app).
- `https://<domain>/sitemap.xml` — the page list.
- `https://<domain>/llms.txt` — the machine-readable summary, generated from the content so it can't drift.

You can also check from the terminal, for example:

```bash
curl -sSI https://<domain>/en | head -n 1
curl -sS https://<domain>/llms.txt | head -n 20
```

The first should report a `200`; the second should print readable text. If the health check is failing, confirm `{{DEFAULT_LOCALE}}` in the compose file is a locale the site actually serves.

---

## Done-check

- [ ] `npm run build` finished cleanly locally right before deploying.
- [ ] `.github/workflows/deploy.yml` and `docker-compose.traefik.yml` are in the site repo with **no** `{{…}}` placeholders left.
- [ ] `{{DEFAULT_LOCALE}}` in the compose file is a real locale the site serves (`en` or `ar`).
- [ ] `DEPLOY_HOST`, `DEPLOY_USER`, and `DEPLOY_SSH_KEY` are set as GitHub Actions secrets — and nowhere in the committed files.
- [ ] The push to `main` ran the deploy workflow and it finished green in the Actions tab.
- [ ] `https://<domain>/en` and `https://<domain>/ar` both load over HTTPS, in the right direction each.
- [ ] `https://<domain>/robots.txt`, `/sitemap.xml`, and `/llms.txt` all load with no error.
