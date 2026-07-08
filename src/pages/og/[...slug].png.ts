/**
 * Per-page OG share cards, generated at build time: one PNG per published
 * field note and work plate. URLs: /og/writing/<id>.png, /og/work/<id>.png.
 * Unpublished drafts get no card (getPublished filters here like everywhere).
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { TOPICS, type TopicSlug } from '../../consts';
import { byDate, byOrder, formatDate, getPublished, noteNumbers, plateNumbers } from '../../utils';
import { renderOgPng, type OgCard } from '../../lib/og-card';

// The same instrument-diagram language as the site: each topic keeps a glyph.
const TOPIC_GLYPH: Record<TopicSlug, string> = {
  quantum: 'polar',
  audio: 'waveform',
  ai: 'spectrum',
  scicomp: 'contour',
  optimization: 'spectrum',
  compilers: 'phases',
  graphics: 'contour',
  blockchain: 'phases',
  photography: 'contour',
  philosophy: 'phases',
};

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = (await getPublished('writing')).sort(byDate);
  const nums = noteNumbers(posts);
  const work = (await getPublished('work')).sort(byOrder);
  const plates = plateNumbers(work);

  return [
    ...posts.map((p) => ({
      params: { slug: `writing/${p.id}` },
      props: {
        eyebrow: `Field note №${nums.get(p.id)} · ${TOPICS[p.data.topics[0] as TopicSlug]}`,
        title: p.data.title,
        footerRight: formatDate(p.data.pubDate),
        glyph: TOPIC_GLYPH[p.data.topics[0] as TopicSlug] ?? 'waveform',
      } satisfies OgCard,
    })),
    ...work.map((w) => ({
      params: { slug: `work/${w.id}` },
      props: {
        eyebrow: `Plate ${plates.get(w.id)} · ${w.data.year}`,
        title: w.data.title,
        footerRight: w.data.role,
        glyph: w.data.glyph,
      } satisfies OgCard,
    })),
  ];
};

export const GET: APIRoute = ({ props }) => {
  return new Response(new Uint8Array(renderOgPng(props as OgCard)), {
    headers: { 'Content-Type': 'image/png' },
  });
};
