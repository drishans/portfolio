/**
 * Launcher for `npm run dev:drafts`: the dev server with draft mode on.
 *
 * A launcher rather than an inline `DRAFT_MODE=1 astro dev` because that
 * syntax does not work in the Windows shell this repo is developed on, and a
 * `cross-env` dependency is not worth carrying for one script.
 *
 * DRAFT_MODE is the single signal draft mode reads. Astro's own `--mode` flag
 * would be the obvious choice, but as of Astro 7.0.7 it changes neither
 * `import.meta.env.MODE` nor the Vite config's `mode`, so nothing downstream
 * can see it.
 */
import { spawn } from 'node:child_process';

spawn('astro', ['dev', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true, // resolves the astro bin from node_modules/.bin on both platforms
  env: { ...process.env, DRAFT_MODE: '1' },
}).on('exit', (code) => process.exit(code ?? 0));
