import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { GLYPHS, TOPIC_SLUGS } from './consts';

const topics = z.array(z.enum(TOPIC_SLUGS)).default([]);

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
    glyph: z.enum(GLYPHS).optional(),
    // Topic hubs this plate appears on (see TOPICS in consts.ts).
    topics,
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
    // Topic hubs this note appears on (see TOPICS in consts.ts).
    topics,
    // Multi-part tutorials: point at a series entry and give this post a part
    // number. Series navigation and the series page derive from this.
    series: z
      .object({ id: reference('series'), part: z.number().int().positive() })
      .optional(),
    draft: z.boolean().default(false),
  }),
});

// "series" = ordered groups of writing entries (tutorial arcs, expeditions).
// One YAML file per series; posts opt in via their `series` frontmatter field.
const series = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/series' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // Who the series is written for. "intro" = curious with no background,
    // "working" = took one college course in the topic, "advanced" = beyond.
    level: z.enum(['intro', 'working', 'advanced']),
    topics,
    // The work plate this series grew out of, if any.
    project: reference('work').optional(),
    // Free-text "you should already know" lines shown on the series page.
    prerequisites: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { work, writing, series };
