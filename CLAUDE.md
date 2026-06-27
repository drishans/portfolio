# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal portfolio + blog ("Field guide") built with **Astro 7**. Ships as
static HTML with **zero client-side framework** by design (the only client JS is
the WebGL hero in `GrainField.astro`). Node 22+ required. The README is the
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

## Architecture

**Content-collection driven.** Pages are generated from Markdown, not
hand-authored. Two collections defined in `src/content.config.ts`:

- `work` — project case studies → rendered as numbered "plates"
- `writing` — blog posts → "field notes"

Adding a `.md` file under `src/content/work/` or `src/content/writing/` adds a
page. Frontmatter is Zod-validated; the schema is the contract. Dynamic routes
(`src/pages/work/[...slug].astro`, `writing/[...slug].astro`) use
`getStaticPaths` → `getCollection` → `render()`, and also compute prev/next
neighbors there. `rss.xml.js` and the index pages read the same collections.

**Draft handling is per-call, not global.** Every place that lists content
filters with `({ data }) => !data.draft` (the two slug routes, the index pages,
and `rss.xml.js`). If you add a new listing, replicate that filter or drafts will
leak.

**Sorting + numbering live in `src/utils.ts`.** `byOrder` (work: by `order`, then
recent year), `byDate` (writing: newest first), `pad` (1-based index →
`"01"`), `readingMinutes` (~200 wpm from raw body). Plate numbers are **derived
from list position via `pad`**, not stored in frontmatter — reordering is done
through the `order` field.

**`src/consts.ts` is the single source of truth** for site identity: `SITE`
(name/title/description/OG), `NAV`, `SOCIAL`. Edit here, not in components.

### Single facts that live in two places (keep in sync)

- **Production domain** `https://drishan.com` — set in *both* `astro.config.mjs`
  (`site:`) and `public/robots.txt`. Drives sitemap, RSS, and absolute OG URLs.
- **The `glyph` enum** — the 5 allowed values (`waveform | spectrum | contour |
  polar | phases`) are declared in `content.config.ts` (validation) **and** drawn
  in `src/components/Glyph.astro` (the SVGs). Adding a glyph means editing both.

## The design system

All visual design is CSS custom properties at the top of
`src/styles/global.css` (`:root`) — palette, fluid type scale (`--step-*`),
spacing (`--s-*`), fonts. Components reference these tokens; change the system
there, not in component `<style>` blocks.

**Gotcha — the live accent is amber, not teal.** The README and the CSS header
comment describe `--signal` as luminous teal (`#5ec6cb`). But in `:root` the teal
`--signal`/`--signal-2` lines are *inside an unterminated block comment* (the
comment opened on the `/* --- Signal` line only closes after `pressed / dim
accent */`), so the actually-applied values are the amber pair below them
(`--signal: #d2823e`). If you touch the palette, mind that comment boundary.

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
