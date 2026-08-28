import { getCollection, type CollectionEntry, type CollectionKey } from 'astro:content';

/**
 * Draft mode: under `npm run dev:drafts` every listing renders drafts
 * alongside published work, each carrying a `<DraftChip />`, and an entry page
 * gets a bar that flips its flag on disk. It exists so auditioning a draft
 * never means flipping the flag, looking, and flipping it back — the move that
 * eventually gets committed by accident.
 *
 * `import.meta.env.DEV` is a compile-time constant Vite folds to `false` in
 * `astro build`, so the environment variable is never even consulted there: a
 * production build cannot render a draft, whatever the CI environment says.
 */
export const SHOW_DRAFTS = import.meta.env.DEV && process.env.DRAFT_MODE === '1';

/**
 * Every published entry of a collection — the one place the draft filter
 * lives. All listings (pages, feeds, hubs) must query through this so a new
 * listing can't leak drafts.
 */
export function getPublished<C extends CollectionKey>(collection: C) {
  return getCollection(collection, ({ data }) => SHOW_DRAFTS || !data.draft);
}

/** Rough reading time from raw markdown body (~200 wpm), ignoring code blocks. */
export function readingMinutes(body: string | undefined): number {
  if (!body) return 1;
  const prose = body.replace(/```[\s\S]*?```/g, ' ');
  const words = prose.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/** Work sorted by plate order, then most recent year. */
export function byOrder(a: CollectionEntry<'work'>, b: CollectionEntry<'work'>) {
  return a.data.order - b.data.order || b.data.year - a.data.year;
}

type Dated = { data: { pubDate: Date } };

/** What noteNumbers needs: a date to order by and a flag to skip drafts. */
type Numbered = { id: string; data: { pubDate: Date; draft: boolean } };

/** Writing sorted newest first. */
export function byDate(a: Dated, b: Dated) {
  return b.data.pubDate.getTime() - a.data.pubDate.getTime();
}

/** Zero-pad a 1-based index → "01", "02", ... */
export const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Public slug for an entry, with any source-folder prefix stripped:
 * `writing/qgpu/past-the-vram-wall` → `past-the-vram-wall`.
 *
 * Content files can be foldered for authoring convenience without that
 * structure leaking into URLs — published permalinks are permanent, so the
 * on-disk layout must stay free to change. Every writing/work URL is built
 * through this, never from `entry.id` directly.
 *
 * Consequence: leaf filenames are the real namespace and must stay unique
 * across folders within a collection. Two files with the same name generate
 * the same path and the build fails on the duplicate.
 */
export const slugOf = (id: string) => id.split('/').pop()!;

/**
 * Stable field-note numbers: №01 is the oldest post, so numbers never change
 * when a new note is published (position-derived numbering would renumber
 * everything on each publish). Precondition: publish in date order — when
 * flipping `draft: false`, set `pubDate` to the actual publish date;
 * backdating a new post renumbers every newer note.
 *
 * Numbers are counted over published posts only. In draft mode that keeps the
 * numbers you see equal to the numbers in production, instead of every note
 * after a draft appearing to shift; a draft shows `—` because it has not
 * earned one yet. Outside draft mode every post is published, so the filter is
 * a no-op and the numbering is unchanged.
 */
export function noteNumbers(posts: Numbered[]): Map<string, string> {
  const chrono = posts
    .filter((p) => !p.data.draft)
    .sort((a, b) => a.data.pubDate.getTime() - b.data.pubDate.getTime());
  const numbers = new Map(chrono.map((p, i) => [p.id, pad(i + 1)]));
  for (const p of posts) if (!numbers.has(p.id)) numbers.set(p.id, '—');
  return numbers;
}

/**
 * Plate numbers keyed by entry id over the full `byOrder` catalog, so a plate
 * carries the same number on every page (topic hubs included), not its
 * position within whatever filtered list happens to render it.
 */
export function plateNumbers(work: CollectionEntry<'work'>[]): Map<string, string> {
  const ordered = [...work].sort(byOrder);
  return new Map(ordered.map((w, i) => [w.id, pad(i + 1)]));
}

/**
 * Dates are authored as `YYYY-MM-DD`, which parses as UTC midnight — format in
 * UTC too, or the dev machine's timezone shifts them a day relative to CI.
 */
export function formatDate(
  date: Date,
  style: 'long' | 'short' = 'long',
): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: style === 'long' ? 'long' : 'short',
    day: style === 'long' ? 'numeric' : '2-digit',
    timeZone: 'UTC',
  });
}
