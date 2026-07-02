# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal portfolio + blog ("Field guide") built with **Astro 7**. Ships as
static HTML with **zero client-side framework** by design (the only client JS
is the WebGL hero in `GrainField.astro` and Expressive Code's tiny copy-button
script on pages with code fences). Node 22+ required. The README is the
authoring/deploy guide; this file covers the things you'd otherwise learn only by
reading several files.

## Commands

```bash
npm run dev      # dev server at http://localhost:4321
npm run build    # static build to ./dist (also fails on content-schema errors)
npm run preview  # serve the built ./dist locally
```

There is **no test, lint, or type-check tooling installed** — no ESLint,
Prettier, Vitest, or `@astrojs/check`. `tsconfig.json` extends Astro's `strict`
preset, but types are only enforced inside the editor. `npm run build` is the de
facto check: Astro validates every content file against the schema and fails the
build on a bad frontmatter field, so build after editing content or schemas.
After touching the rendering stack (math, code blocks, prose CSS), eyeball
`/writing/kitchen-sink` — a permanent `draft: true` page that exercises every
feature; flip its flag locally to view it, never commit the flip.

**Dependencies:** we develop on Windows but Cloudflare builds on Linux. When
changing deps, edit `package.json` and let `.github/workflows/relock.yml`
regenerate `package-lock.json` on Linux — never commit a Windows-generated
lockfile (details in that file's header comment).

## Architecture

**Content-collection driven.** Pages are generated from Markdown, not
hand-authored. Three collections defined in `src/content.config.ts`:

- `work` — project case studies → rendered as numbered "plates"
- `writing` — blog posts → "field notes"; a post can join a series via
  `series: { id, part }` frontmatter
- `series` — one YAML file per multi-part tutorial arc (title, level,
  prerequisites, optional `project` reference to a work plate) → pages at
  `/series/<slug>/`

Adding a `.md` file under `src/content/work/` or `src/content/writing/` adds a
page. Frontmatter is Zod-validated; the schema is the contract. Dynamic routes
(`src/pages/work/[...slug].astro`, `writing/[...slug].astro`) use
`getStaticPaths` → `getPublished()` → `render()`, and also compute prev/next
neighbors there (series-aware for posts in a series). `rss.xml.js` and the
index pages read the same collections.

**Drafts are filtered in one place.** Query content through `getPublished()`
from `src/utils.ts` — never raw `getCollection` — and new listings can't leak
drafts.

**Topics are the navigation axis.** `TOPICS` in `src/consts.ts` (slug →
display name) drives the Zod enum, the `/topics/` index, and per-topic hub
pages that aggregate work + writing + series. A hub only renders once its
topic has published work or writing, so adding a topic is one line.

**Sorting + numbering live in `src/utils.ts`.** `byOrder` (work: by `order`,
then recent year), `byDate` (writing: newest first), `pad` (1-based index →
`"01"`), `noteNumbers` (stable note №s: oldest post = №01 — when publishing a
draft, set its `pubDate` to the actual publish date; backdating renumbers
every newer note), `plateNumbers` (one number per plate on every page),
`readingMinutes` (~200 wpm, code fences excluded),
`formatDate` (**always UTC** — authored dates parse as UTC midnight, so
local-timezone formatting would shift them a day between dev and CI). Plate
numbers are derived from list position via `pad`; reordering is done through
the `order` field.

**`src/consts.ts` is the single source of truth** for site identity and
shared enums: `SITE` (name/title/description/OG), `NAV` (also feeds the 404
page), `SOCIAL`, `TOPICS`, and `GLYPHS` (the glyph tuple — the schema and
component props derive from it; adding a glyph means drawing the SVG in
`Glyph.astro` and adding the name there).

**Markdown pipeline** (configured in `astro.config.mjs`): Astro 7's Sätteri
processor with `math: true` + the plugins in `src/lib/satteri-plugins.mjs`:
`temmlMath` renders `$…$` / `$$…$$` to build-time MathML via mdast `html`
nodes (the `rawHtml` escape hatch re-parses as a block and shatters the
paragraph around inline math — don't switch back), `tableWrap` wraps GFM
tables in a scroll container. No client JS; the math font (STIX Two Math) and the
vendored Temml support stylesheet (`src/styles/temml.css`) are imported in
`BaseHead.astro`.
Code fences render through `astro-expressive-code` (frames, titles, `{n-m}`
line marks, copy button — its only client JS), themed to the palette via
`styleOverrides`. Sätteri is **not** remark/rehype: its plugins use
`mdastPlugins`/`hastPlugins` with a different API.

### Single facts that live in two places (keep in sync)

- **Production domain** `https://drishan.com` — set in *both* `astro.config.mjs`
  (`site:`) and `public/robots.txt`. Drives sitemap, RSS, and absolute OG URLs.
- **`theme-color`** in `BaseHead.astro` mirrors `--ink` in `global.css`.

### Permalinks

Published URLs are permanent. Renames get a 301 in `public/_redirects`
(static rules before dynamic ones), never a deletion. See ROADMAP.md for the
standing decisions and future passes.

## The design system

All visual design is CSS custom properties at the top of
`src/styles/global.css` (`:root`) — palette, fluid type scale (`--step-*`),
spacing (`--s-*`), fonts. Components reference these tokens; change the system
there, not in component `<style>` blocks.

**Fonts** are self-hosted variable fonts via `@fontsource-variable` (no external
requests), imported in `BaseHead.astro`. Headings (Fraunces) are driven by
optical-size/weight axes through `font-variation-settings` — Fraunces must use
the `/full.css` import (carries the opsz/SOFT/WONK axes), not `index.css`.

**The hero** (`GrainField.astro`) is a domain-warped fractal-noise WebGL shader
that tracks the cursor. It pauses off-screen, falls back to a CSS gradient
without WebGL, and renders one static frame under `prefers-reduced-motion`.
Preserve those three fallback paths when editing it.

## Layout chain

`Base.astro` (HTML shell: `BaseHead` + `Header` + `<slot/>` + `Footer`) is
wrapped by `Project.astro` (work case-study template) and `Post.astro` (field
note). The slug routes pass a rendered `<Content />` into those layouts.

## Commit conventions

Use Conventional Commits: `type(scope): summary`

- Summary in imperative mood, lowercase, no trailing period, under ~60 chars.
- One logical change per commit (a new post is its own commit; don't fold in unrelated CSS tweaks).
- Add a body (blank line, then prose) only when the *why* isn't obvious from the summary.

**Types**
- `content` — new or substantially edited post or project entry
- `feat` — new site feature or component
- `fix` — bug fix
- `style` — visual/CSS/design change with no logic change
- `chore` — config, deps, tooling, build, docs setup
- `docs` — README or code comments
- `refactor` — restructuring without behavior change

**Scopes** (optional): `writing`, `work`, `home`, `about`, `og`, `fonts`, `seo`, `deploy`

**Examples**
- `content(writing): add field note on cuQuantum on the 5090`
- `content(work): add QuDaQ plate`
- `feat(home): add accent-color switcher`
- `style(og): simplify share image to wordmark + wave`
- `chore(fonts): swap Fraunces for Space Grotesk`
- `docs: update README for field-guide concept`

Do not add Claude/AI attribution or co-author trailers to commit messages.
