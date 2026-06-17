# Field guide

A portfolio and blog built like an engraved field guide to the work — a
near-black ground, a single luminous signal-teal accent, a high-contrast almanac
serif, and small hand-drawn instrument diagrams (waveforms, contours, polar
plots) in the spirit of vintage-scientific gig-poster art. The hero is a
hand-written WebGL field. Built with [Astro](https://astro.build), ships as
static HTML with zero client-side framework, and is wired so adding a project or
post is just dropping in a Markdown file.

Projects are *plates* (numbered, like specimen plates — and dubplates). Writing
is *field notes*. Project metadata is set like an instrument readout.

---

## Quick start

```bash
npm install
npm run dev      # local dev server at http://localhost:4321
npm run build    # production build to ./dist
npm run preview  # serve the production build locally
```

Requires Node 22+.

---

## First things to change

Most of what you'll want to edit lives in **`src/consts.ts`**:

- `SITE` — your name, title, description, tagline, and default OG image.
- `NAV` — the top navigation.
- `SOCIAL` — your GitHub / LinkedIn / email links (used in the footer and About
  page). Set any `href` to `''` to hide that row.

The production domain is set to `https://drishan.com` in **`astro.config.mjs`**
(the `site` field) and in `public/robots.txt` — used for the sitemap, RSS feed,
and OG/share URLs. Change it if the domain changes.

A couple of placeholder bits to replace before publishing:

- The About page intro (`src/pages/about.astro`) is seeded from your background —
  rewrite it in your own words. There's a marked note in the file, and the
  toolkit list is a starter (add your DAW, synths, etc.).
- Drop a `1200×630` share image at `public/og-default.png` (referenced by
  `SITE.ogImage`).
- The project and post content contains a few `{curly-brace placeholders}` where
  a real metric or detail should go. Search the `src/content` folder for `{`.

---

## Adding a project

Create a Markdown file in `src/content/work/`. The frontmatter is type-checked
against the schema in `src/content.config.ts`:

```markdown
---
title: Project Name
summary: One line shown on the plate and as the page description.
role: Solo build
stack: ['Rust', 'WASM', 'WebGL']
year: 2026
length: '3 months'    # optional — shown in the readout as "Length"
order: 1              # lower number = earlier plate in the field guide
glyph: waveform       # optional — waveform | spectrum | contour | polar | phases
repo: https://github.com/...   # optional
live: https://...              # optional
draft: false          # set true to hide without deleting
---

Markdown body becomes the case study. Use `## headings`, lists, `> quotes`, etc.
```

The plate number (01, 02, …) is assigned automatically from `order`. The `glyph`
picks which instrument diagram is stamped on the card.

## Adding a post

Create a Markdown file in `src/content/writing/`:

```markdown
---
title: Post title
description: One-line summary for the index, RSS, and share cards.
pubDate: 2026-06-15
updatedDate: 2026-06-20   # optional
tags: ['quantum', 'gpu']
draft: false
---

Body in Markdown. Reading time is estimated automatically.
```

Field notes are sorted newest-first and grouped by year on the Writing page.

---

## Project structure

```
src/
├── consts.ts            Site metadata, nav, social links — start here
├── content.config.ts    Frontmatter schemas for work + writing
├── utils.ts             Reading-time + sorting helpers
├── styles/global.css    The design system (palette, type, prose)
├── components/
│   ├── BaseHead.astro   <head>, fonts, SEO/OG tags
│   ├── Header.astro     Sticky nav
│   ├── Footer.astro     Colophon + contact
│   ├── GrainField.astro The WebGL hero field (signature element)
│   ├── Glyph.astro      The instrument-diagram SVGs (waveform, polar, …)
│   ├── PlateCard.astro  A project plate on the index / work pages
│   ├── Readout.astro    Mono key/value metadata block
│   └── NoteRow.astro    A row on the Writing index
├── layouts/
│   ├── Base.astro       HTML shell
│   ├── Project.astro    Work case-study template (a plate)
│   └── Post.astro       Field-note (blog post) template
├── pages/
│   ├── index.astro      Home (hero + plates + recent field notes)
│   ├── work/            Work index + [slug] route
│   ├── writing/         Writing index + [slug] route
│   ├── about.astro
│   ├── 404.astro
│   └── rss.xml.js       RSS feed
└── content/
    ├── work/            Your project Markdown files
    └── writing/         Your post Markdown files
```

---

## The design system

Everything visual is driven by CSS custom properties at the top of
`src/styles/global.css`:

- `--ink` family — cool near-blacks (backgrounds and specimen boxes)
- `--silver` — primary text, a cool bone white (not pure white)
- `--signal` — the one accent (`#5ec6cb`, luminous teal); used sparingly
- `--violet` — a second note (`#9b8ee2`) reserved for the hero field's duotone

Type is a deliberate trio, all self-hosted via `@fontsource-variable` (no
external requests):

- **Fraunces** (high-contrast display serif) — headings and the wordmark, driven
  by its optical-size / weight axes (imported via `full.css`, which carries them)
- **Newsreader** — editorial body and prose
- **JetBrains Mono** — plate annotations, readouts, and labels

The hero shader lives in `src/components/GrainField.astro`: domain-warped fractal
noise with a teal-to-violet glow that tracks the cursor. It pauses off-screen,
falls back to a CSS gradient without WebGL, and renders a single static frame
under `prefers-reduced-motion`. The small plate diagrams are original SVGs in
`src/components/Glyph.astro` — swap or add shapes there.

### Want React (or MDX) later?

This scaffold uses zero React by design. If you later want an interactive React
island or components-in-Markdown, add them with Astro's integrations:

```bash
npx astro add react
npx astro add mdx
```

---

## Deploying

**Cloudflare Pages** (set up for this) — connect the repo as a Pages project,
framework preset **Astro** (build command `npm run build`, output directory
`dist`), and add an environment variable `NODE_VERSION` = `22`. It rebuilds on
every push. Add `drishan.com` under the project's **Custom domains** tab; since
the domain is already on Cloudflare, DNS and SSL wire up automatically. Leave
`base` unset in `astro.config.mjs` for a root domain.

**GitHub Pages** (alternative) — add a workflow at `.github/workflows/deploy.yml`
that runs `astro build` and publishes `dist` via `actions/deploy-pages`, then
enable Pages in Settings → Pages → Source: GitHub Actions. For a *project* page
(`username.github.io/repo`), set `base: '/repo'` in `astro.config.mjs`.

---

## A note on `npm audit`

A fresh install reports a few high-severity advisories in `esbuild`. These are
**development-server only** (they don't affect the static HTML you build and
deploy), and they reach you transitively through Astro's toolchain. Running
`npm audit fix --force` will downgrade Astro and break the build, so don't. They
resolve on their own as Astro updates its dependencies.
