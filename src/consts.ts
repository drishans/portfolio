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
  /** Your handle without the @ — used for the twitter:creator tag. Leave '' to omit. */
  twitter: '',
} as const;

/** Top navigation. Keep it short. */
export const NAV = [
  { label: 'Work', href: '/work/' },
  { label: 'Writing', href: '/writing/' },
  { label: 'About', href: '/about/' },
] as const;

/** Footer / contact links. Set href to '' to hide a row. */
export const SOCIAL = [
  { label: 'GitHub', href: 'https://github.com/drishans' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/drishan96/' },
  { label: 'Email', href: 'mailto:drishan.sarkar@gmail.com' },
] as const;
