// Single source of truth for site metadata. Edit these and the whole site updates.

export const SITE = {
  /** Your name — used in the wordmark and as the OG site name. */
  author: 'Drishan',
  /** Browser tab title / OG site title. */
  title: 'Drishan Sarkar -- Quantum · AI · Systems',
  /** Default meta description and RSS feed description. */
  description:
    'Engineer working across quantum computing, AI systems, and the low-level glue between them. Selected work and writing.',
  /** A one-line role descriptor shown in the hero and header. */
  tagline: 'Quantum · AI · Systems',
  /** Default OG/Twitter share image (place a 1200×630 file in /public). */
  ogImage: '/og-default.png',
  /** What the share image depicts — og:image:alt, not the page title. */
  ogImageAlt: 'Drishan — field guide wordmark on a dark engraved grid',
  /** Your handle without the @ — used for the twitter:creator tag. Leave '' to omit. */
  twitter: '',
} as const;

/** Top navigation. Keep it short. */
export const NAV = [
  { label: 'Work', href: '/work/' },
  { label: 'Writing', href: '/writing/' },
  { label: 'Gallery', href: '/gallery/' },
  { label: 'About', href: '/about/' },
] as const;

/** Footer / contact links. Set href to '' to hide a row. */
export const SOCIAL = [
  { label: 'GitHub', href: 'https://github.com/drishans' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/drishan96/' },
  { label: 'Email', href: 'mailto:drishan.sarkar@gmail.com' },
] as const;

/**
 * The topic taxonomy — slug → display name. One entry here is all it takes to
 * add a topic: the content schemas, hub pages, and chips all derive from this
 * map. Hub pages only render for topics with published work or writing, so an
 * unused topic costs nothing.
 */
export const TOPICS = {
  quantum: 'Quantum',
  audio: 'Audio & acoustics',
  graphics: 'Graphics',
  compilers: 'Compilers',
  scicomp: 'Scientific computing',
  optimization: 'Optimization',
  ai: 'AI / ML',
  blockchain: 'Blockchain',
  photography: 'Photography',
  philosophy: 'Philosophy',
} as const;

export type TopicSlug = keyof typeof TOPICS;
export const TOPIC_SLUGS = Object.keys(TOPICS) as [TopicSlug, ...TopicSlug[]];

/**
 * Instrument-diagram glyphs stamped on plate cards. The names must match the
 * SVGs drawn in src/components/Glyph.astro — adding a glyph means drawing it
 * there and listing it here; the content schema and component props derive
 * from this tuple.
 */
export const GLYPHS = ['waveform', 'spectrum', 'contour', 'polar', 'phases'] as const;
export type GlyphName = (typeof GLYPHS)[number];
