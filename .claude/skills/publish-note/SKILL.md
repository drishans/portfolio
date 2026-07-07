---
name: publish-note
description: Publish a drafted field note or series part on drishan.com. Use when asked to publish, ship, go live with, or flip a note or series part. Handles pubDate bumping, stable note numbering, draft flags, day-one series extras (series yaml, repo visibility), build verification, and deploy sanity checks.
---

# Publishing a note

Drishan rewrites every draft himself before publishing. This skill is the
mechanical checklist that runs after his rewrite. If the note still reads
like scaffold text he has not touched, stop and ask before proceeding.

## The checklist, in order

1. Confirm which note is being published. Read it. Verify it currently has
   `draft: true`.
2. **Set `pubDate` to today.** Note numbers are assigned oldest-first by
   pubDate across published notes, so a new note must carry a pubDate at
   least as new as every published note. Backdating renumbers every newer
   note and breaks the printed numbers. Check with:
   `grep -H "^pubDate" src/content/writing/*.md` cross-referenced against
   each file's `draft:` line.
3. Flip `draft: false` on the note. Nothing else.
4. **First part of a new series only:** also flip the series yaml's
   `draft:` in `src/content/series/`, and take the project repo public
   with `gh repo edit drishans/<repo> --visibility public
   --accept-visibility-change-consequences`. Confirm with Drishan first;
   going public is a one-way door in practice.
5. `npm run build`. Confirm `dist/writing/<slug>/index.html` exists and
   that previously published notes kept their numbers (spot-check the
   /writing/ index in dist).
6. Commit as `content(writing): publish <short title>` and push. Do not
   add any AI attribution or co-author trailer. Cloudflare deploys main
   automatically.
7. After a couple of minutes:
   `curl -s https://drishan.com/writing/<slug>/ -o /dev/null -w "%{http_code}"`
   should print 200.

## Never

- Never publish a note Drishan has not rewritten.
- Never backdate a pubDate.
- Never delete or rename a published URL. Renames get a 301 in
  `public/_redirects` first, and the old path lives forever.
