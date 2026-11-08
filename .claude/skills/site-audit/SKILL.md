---
name: site-audit
description: Run the recurring health audit across drishan.com and both galleries, then propose ROADMAP.md updates. Use when asked to audit the site, check site health, review the state of the site, or refresh the roadmap. Read-only findings first; fixes only as separate follow-ups.
---

# Site audit

A read-only sweep. Report findings ranked by impact; do not fix anything
in the same pass unless asked. End with a proposed ROADMAP.md delta
(shipped items moved to the ledger, loose ends listed, next passes
reordered) as a branch + PR.

## 1. Repo state

- `git fetch`; diff ROADMAP.md's claims against reality (merged PRs, open
  PRs, published vs draft counts).
- Consistency traps that have actually happened: a published series whose
  work plate is still draft; gallery items still draft while a published
  note links to them; stray superseded draft files; a repo still private
  after its series published; series yaml missing a `project:` link its
  plate could satisfy.

## 2. Build + content

- `npm run build` (portfolio) and `npm run build` (gallery repo) both green.
- Em-dash budget on any unpublished drafts: `grep -c "—"` per file, prose
  target zero to one per note (table null markers excused).
- Every published note's numbers still trace to a project-repo script or
  results JSON (spot-check anything edited since last audit).

## 3. Head-tag sweep (built dist/)

For every dist HTML file, assert exactly one each: `<title>`, meta
description, canonical, `og:image`, `theme-color`. Published notes and
plates should point at their own `/og/...` card, not the default.

```bash
for f in $(find dist -name "*.html"); do
  echo "$f $(grep -c '<title>' $f) $(grep -c 'name=\"description\"' $f) \
  $(grep -c 'og:image' $f) $(grep -c 'rel=\"canonical\"' $f)"; done
```

## 4. Live checks

- 200s: drishan.com, /writing/, /gallery/, /rss.xml, sitemap-index.xml,
  one /og/ card (content-type image/png), audio.drishan.com,
  photos.drishan.com, one media.drishan.com derivative.
- Mobile geometry on both galleries at 375×812 in the preview browser:
  open a slide, body scroll locked, caption clear of the nav arrows,
  restored on every close path (button, backdrop, Esc).
- If a page with the widget runtime is published: element upgrades on
  scroll, audio starts only after the power button.

## 5. A11y + rendering spot checks

- Skip link present; `lang` set; decorative SVGs aria-hidden; focus-visible
  styles intact.
- If the rendering stack changed since last audit: flip
  `/writing/kitchen-sink` locally and eyeball math, tables, code frames,
  and the widget section. Never commit the flip.

## 6. Output

A ranked findings list (worst first, each with the one-line fix), then the
ROADMAP.md delta as a PR. Anything fixed on the spot must be listed as
fixed, not silently absorbed.
