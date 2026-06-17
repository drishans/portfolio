import type { CollectionEntry } from 'astro:content';

/** Rough reading time from raw markdown body (~200 wpm). */
export function readingMinutes(body: string | undefined): number {
  if (!body) return 1;
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/** Work sorted by plate order, then most recent year. */
export function byOrder(a: CollectionEntry<'work'>, b: CollectionEntry<'work'>) {
  return a.data.order - b.data.order || b.data.year - a.data.year;
}

/** Writing sorted newest first. */
export function byDate(a: CollectionEntry<'writing'>, b: CollectionEntry<'writing'>) {
  return b.data.pubDate.getTime() - a.data.pubDate.getTime();
}

/** Zero-pad a 1-based index → "01", "02", ... */
export const pad = (n: number) => String(n).padStart(2, '0');
