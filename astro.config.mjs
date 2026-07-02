// @ts-check
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import sitemap from '@astrojs/sitemap';
import expressiveCode from 'astro-expressive-code';
import { temmlMath, tableWrap } from './src/lib/satteri-plugins.mjs';

// https://astro.build/config
export default defineConfig({
  // Used to generate absolute URLs for the sitemap, RSS feed and OG tags.
  // Also set in public/robots.txt — keep the two in sync.
  site: 'https://drishan.com',
  markdown: {
    // `math: true` parses $…$ / $$…$$; the temmlMath plugin renders the
    // parsed TeX to MathML at build time — no client JS, no KaTeX stylesheet.
    // Fonts: see the math rules in src/styles/global.css.
    processor: satteri({
      features: { math: true },
      mdastPlugins: [temmlMath],
      hastPlugins: [tableWrap],
    }),
  },
  integrations: [
    expressiveCode({
      themes: ['vitesse-dark'],
      useDarkModeMediaQuery: false,
      styleOverrides: {
        // Match the field-guide plate chrome (tokens from global.css).
        borderRadius: '2px',
        borderColor: 'var(--hair)',
        codeBackground: 'var(--ink-2)',
        codeFontFamily: 'var(--mono)',
        codeFontSize: 'var(--step--1)',
        uiFontFamily: 'var(--mono)',
        // vitesse-dark ships a transparent focus outline — keyboard focus on
        // scrollable frames must be visible.
        focusBorder: 'var(--signal)',
        frames: {
          shadowColor: 'transparent',
          editorTabBarBackground: 'var(--ink-3)',
          editorActiveTabBackground: 'var(--ink-2)',
          editorActiveTabIndicatorTopColor: 'var(--signal)',
          terminalBackground: 'var(--ink-2)',
          terminalTitlebarBackground: 'var(--ink-3)',
        },
      },
    }),
    sitemap(),
  ],
  build: { format: 'directory' },
});
