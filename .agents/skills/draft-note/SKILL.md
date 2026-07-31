---
name: draft-note
description: Draft a new field note (blog post), series part, or work plate for drishan.com in Drishan's voice and this repo's conventions. Use whenever asked to write, draft, or scaffold a post, note, tutorial part, series, or project plate. Covers frontmatter contracts, prose style (em-dash budget, timelessness), figures, math, and the drafts-only rule.
---

# Drafting a field note

## Hard rules, never break these

1. **Always `draft: true`.** Drishan rewrites every draft in his own voice
   and flips the flag himself. Never set `draft: false`. Never "publish".
2. **Never invent numbers.** Every measurement in a note comes from a
   script output, results JSON, or provenance sidecar committed in a
   project repo. If a number does not exist yet, run the experiment or
   leave a visible `TODO(measure)`.
3. Work on a `content/<slug>` branch and open a PR. Do not push content
   directly to main.

## Prose style (Drishan's voice)

- **Em-dashes: at most one per two or three notes**, and only where a
  reversal or turn genuinely earns it. Use colons, commas, parentheses, or
  split the sentence. Overuse is the strongest tell of generated text.
- **Timeless over topical.** Organize a note around models, methods, and
  measurements that survive version churn. Version-specific breakage gets
  one short section, explicitly dated ("current as of X"), that ends with
  the general recipe for re-deriving the fix when the names rot.
- First person, direct, contractions welcome. Short fragments for punch
  ("Pick position. Mallet hardness."). Humor dry and rationed.
- Lead each section with the claim, then the evidence. Use tables for
  designed-versus-measured comparisons. Link the project repo early.
- Titles are sentences or strong noun phrases, not listicles.

## Frontmatter contracts (Zod-validated; the build fails on violations)

Field note (`src/content/writing/<slug>.md`):

```yaml
---
title: ...
description: ...        # one or two sentences, no colon-jamming
pubDate: YYYY-MM-DD     # today; publishing bumps it (see publish-note)
tags: ['lowercase', 'freeform']
topics: ['audio']       # keys of TOPICS in src/consts.ts only
series:                 # only if part of a series
  id: <series-yaml-basename>
  part: N
draft: true
---
```

Work plate (`src/content/work/<slug>.md`): `title, summary, role, stack,
year, length, order, glyph (one of GLYPHS in src/consts.ts), topics, repo,
draft: true`.

Series (`src/content/series/<id>.yaml`): `title, description, level,
topics, prerequisites, draft: true`.

## Rendering stack constraints

- Math: `$...$` and `$$...$$` render at build time to MathML. **Never use
  rawHtml for inline math**; it re-parses as a block and shatters the
  paragraph (see the header comment in `src/lib/satteri-plugins.mjs`).
- Code fences render through Expressive Code: `title="..."`,
  `frame="terminal"`, and `{n-m}` line marks all work.
- Figures are generated offline and committed to
  `src/assets/figures/<slug-or-series>/`, referenced as
  `../../assets/figures/...`. Line plots as SVG using the project repo's
  `fieldguide.mplstyle`; spectrograms as PNG on the `#0a0c0f` background.
- Dates format in UTC. Note numbers derive from pubDate order (oldest is
  01), so drafts use today's date and get bumped at publish time.

## Verify before finishing

1. `npm run build` passes (this validates every frontmatter field).
2. `grep -c "—" <the draft>` and justify anything above zero.
3. If you touched the rendering stack itself, flip `/writing/kitchen-sink`
   to `draft: false` locally to eyeball it, and never commit that flip.
