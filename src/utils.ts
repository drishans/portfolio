import { getCollection, type CollectionEntry, type CollectionKey } from 'astro:content';

/**
 * Every published entry of a collection — the one place the draft filter
 * lives. All listings (pages, feeds, hubs) must query through this so a new
 * listing can't leak drafts.
 */
export function getPublished<C extends CollectionKey>(collection: C) {
  return getCollection(collection, ({ data }) => !data.draft);
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

/** Writing sorted newest first. */
export function byDate(a: Dated, b: Dated) {
  return b.data.pubDate.getTime() - a.data.pubDate.getTime();
}

/** Zero-pad a 1-based index → "01", "02", ... */
export const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Stable field-note numbers: №01 is the oldest post, so numbers never change
 * when a new note is published (position-derived numbering would renumber
 * everything on each publish). Precondition: publish in date order — when
 * flipping `draft: false`, set `pubDate` to the actual publish date;
 * backdating a new post renumbers every newer note.
 */
export function noteNumbers(posts: (Dated & { id: string })[]): Map<string, string> {
  const chrono = [...posts].sort((a, b) => a.data.pubDate.getTime() - b.data.pubDate.getTime());
  return new Map(chrono.map((p, i) => [p.id, pad(i + 1)]));
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
