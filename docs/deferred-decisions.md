# Deferred decisions

**Who this is for:** anyone deciding what to build next in nabcor, or wondering why a "missing" feature is missing.
**How long to read:** about 8 minutes.
**What you'll know after:** the four things nabcor left out on purpose — extensions, runtime theming, search, and login — and the exact questions each one has to answer before anyone builds it.

---

## Read this first

Everything on this page was **left out on purpose.** None of it is a bug, a gap, or a "we ran out of time." Each item is a decision to *wait* until we can answer a small set of hard questions, because building it too early would lock in a mistake that is expensive to undo later.

nabcor's whole point is that three things stay separate and simple: the **content** (typed files), the **theme** (a package chosen at build time), and the **layout** (the Next.js app). Every feature below is tempting, and every one of them, added carelessly, would blur those lines. So we drew the boundary, wrote down why, and stopped.

If you are about to add one of these, the rule is simple: **answer the questions listed under that item first.** If you cannot answer them yet, it is not time to build it.

---

## 1. Extensions (plugins)

### What it is

A way for someone to add behaviour to a nabcor site without editing the core — the same itch WordPress plugins scratch. Add analytics tags to the page. Contribute a new kind of section. Reshape the content before it renders.

### What actually ships today

A **contract, and nothing else.** In `packages/core/src/contracts/extension.ts` there is a single typed shape:

```
NabcorExtension = {
  id: string
  capabilities: Capability[]   // what it is allowed to touch, declared up front
  hooks: Partial<ExtensionHooks>   // where it plugs in
}
```

`Capability` is a short, closed list — for example `read:content`, `inject:head`, `inject:section`, `extend:schema`. An extension gets **only** what it lists. There is no "read anything" mode.

That is the entire feature. There is deliberately:

- **no loader** — nothing that finds extensions and turns them on,
- **no registry** — nowhere they live or get listed,
- **no runtime** — nothing that actually runs them,
- **no example extension** — not even one working sample.

Nothing in nabcor imports this file at runtime. It is a promise about a future shape, written as types, so that when the runtime is finally built it is *forced* to conform to a design we already agreed on.

### Why it's deferred (the WordPress lesson)

It is tempting to blame WordPress's problems on "plugins." That is the wrong lesson. Plugins are not the flaw. **The execution model is the flaw.**

In WordPress, every plugin runs inside one shared process with one shared set of permissions. So any plugin can read or write anything — your content, your database, other plugins' data, the site's secrets. One sloppy or malicious plugin compromises the whole site. The danger was never that extra code existed; it was that all the extra code was trusted with everything.

nabcor refuses to ship that model. We reserved the *socket* — the typed, permission-scoped shape above — so the design is settled early. But we will not ship the *runtime* that actually runs foreign code until we can answer how that code is kept in its lane.

### The three questions to answer first

1. **Where exactly do extensions intervene?** Which precise moments in the build and render can an extension touch, and what does it see at each one? Vague "hooks everywhere" is how you end up trusting everything again.
2. **How do they register?** How does a site declare which extensions it uses and turn them on — and how is that list itself trustworthy, so nothing runs that the site owner did not choose?
3. **What isolation model grants trust?** This is the hard one. What actually keeps an extension from doing damage? A container? A WASM sandbox? Or the strictest and simplest answer — **build-time only**, so extensions run when the site is built and never touch a live request at all? Until this is answered, no runtime gets built.

The contract's own comments name these same three questions and end with: do not add a loader, a registry, or a sandbox without answering them. This page is where the answers must land.

---

## 2. Runtime theming (switching look per request)

### What it is

Changing a site's whole appearance while it is running — for example, one deployment that serves many brands and picks the right colors and fonts per visitor, per tenant, or per domain, on every request. (Nabtiq's own `oliiva` / meals platform does something like this for its per-tenant branding.)

### Why it's deferred

In nabcor, a theme is **chosen at build time, like a dependency.** A site imports exactly one theme package, the build bakes it in, and the design fails to compile if the theme is missing any section component. That single fact buys nabcor a lot: pages are static, fast, cacheable, and provably complete before they ever ship. There is no runtime theme registry to misconfigure and no way to serve a half-built look.

Per-request theme switching throws that away. The build can no longer prove one finished look; it has to keep several themes live and choose between them while serving traffic. That means a runtime theme system, runtime token loading, and a real risk of the "flash of the wrong style" that the build-time model makes impossible. It is a different architecture, not a small setting — so it stays out of the core.

This is a **scope line, not a criticism.** A product like `oliiva` that genuinely needs one deployment for many brands is a legitimate thing to build; it simply is not what the shared core is for. The audited baseline is deliberately build-time only. (`oliiva` also sits on an older React for its payment and data integrations and is out of scope for the core for that reason too.)

### The questions to answer first

1. **Is per-request switching truly required, or is per-build enough?** Many "multi-brand" needs are satisfied by building several sites from one shared theme with different tokens. Runtime switching should only win when separate builds genuinely cannot.
2. **How do you keep it static and fast?** What is cached, and what is decided per request, so you do not trade away the speed and cacheability that build-time theming guarantees?
3. **How is language and text direction still set on the server?** nabcor sets `lang` and `dir` server-side on purpose, to kill the flash-of-wrong-direction bug. Any runtime theme system has to preserve that guarantee, not reintroduce the flash.
4. **Where does the per-request choice come from?** Domain, subdomain, path, a header, a lookup? And is that source trustworthy enough to drive what every visitor sees?

---

## 3. Search

### What it is

A way for visitors to search the content of a site — a search box, and results.

### Why it's deferred

nabcor sites are small, static, code-resident marketing sites: a handful of sections on a page or two, in two languages. At that size, search is a solution to a problem the sites do not have yet. Adding it now would mean picking an approach — an index built at build time, a hosted search service, or a heavier system — before we know which kind of site actually needs it. Every one of those choices drags in weight, moving parts, or an outside dependency that the current sites would carry without benefit. So search waits until a real site is big enough to need it.

### The questions to answer first

1. **What is even being searched?** Only the typed section content, or long-form articles (the separate `ArticleContent` type), or both?
2. **Build-time index or runtime service?** A static index built alongside the site keeps the "no database, no server to babysit" promise. A hosted search service is more powerful but adds an outside dependency and a new failure point. Which one, and why?
3. **How does it work in both languages?** Arabic and English search behave differently. Results, matching, and direction all have to be right in each — not just English with Arabic bolted on.
4. **Does it stay static-first?** Whatever ships must not quietly turn a static site into one that needs a live server it did not need before.

---

## 4. Auth (logins and accounts)

### What it is

Letting people log in — accounts, passwords, sessions, member-only or admin-only areas.

### Why it's deferred

This is the most deliberate omission on the page. nabcor is **static-first and has no database and no admin panel by design.** Content lives in code, is validated before it ships, and every page can be rendered ahead of time. The moment you add real logins you add accounts to store, sessions to manage, a database to run, and a permanent security surface to defend. That is a fundamentally different kind of system from the one the cross-project audit endorsed, in which the mature sites are code-resident and have no runtime admin at all.

nabcor already handles the one interactive thing these sites actually need — the **contact form** — without any of that. It runs through a small pipeline with a pluggable delivery adapter (email by default, a file-log fallback otherwise), and it needs no accounts and no login. Reaching for full auth to cover contact would be solving a problem the site does not have.

### The questions to answer first

1. **Who logs in, and for what?** A site visitor becoming a member is a completely different problem from a staff member editing content. Guessing wrong here builds the wrong system.
2. **Does auth even belong in the core?** If a specific site needs member accounts, that may be a job for a dedicated build or an outside identity provider — not something baked into a shared foundation whose promise is "no database, no admin."
3. **What breaks the static guarantee, and is that acceptable?** Logins usually force a live server and per-request logic. Be explicit about exactly what stops being static, and confirm that trade is worth it for the site in question.
4. **Where does the security burden land?** Passwords, sessions, and personal data are a lasting responsibility, not a feature you ship and forget. Who owns keeping it safe, and are they set up to?

---

## The one rule

These four are doors we framed and left shut. When you are ready to open one, the price of entry is the list of questions under it — **answered, and written down back here.** Build the answers first. The feature comes after.
