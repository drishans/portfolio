import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// "work" = project case studies, presented as numbered plates in the field guide.
const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: z.object({
    title: z.string(),
    // One-line summary shown on the plate and as the meta description.
    summary: z.string(),
    // Your role on the project, e.g. "Solo build" or "Research contribution".
    role: z.string(),
    // Tech stack, rendered as mono tags.
    stack: z.array(z.string()).default([]),
    // Year (or year range as a number for sorting — use the start year).
    year: z.number(),
    // Human duration, shown in the readout as "Length", e.g. "8 months".
    length: z.string().optional(),
    // Controls plate order in the field guide (lower = earlier plate).
    order: z.number().default(99),
    // Optional external links.
    repo: z.string().url().optional(),
    live: z.string().url().optional(),
    // Which instrument diagram to stamp on the plate card.
    glyph: z.enum(['waveform', 'spectrum', 'contour', 'polar', 'phases']).optional(),
    // Hide from the site without deleting the file.
    draft: z.boolean().default(false),
  }),
});

// "writing" = blog posts, presented as printed plates.
const writing = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { work, writing };
