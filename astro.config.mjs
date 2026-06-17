// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  // TODO: set this to your real domain before deploying.
  // It is used to generate absolute URLs for the sitemap, RSS feed and OG tags.
  site: 'https://drishan.com',
  integrations: [sitemap()],
  build: { format: 'directory' },
});
