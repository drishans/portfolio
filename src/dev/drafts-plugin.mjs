/**
 * Draft mode's write side: a small HTTP surface for seeing the draft state of
 * every content file and flipping it from the browser.
 *
 *   GET  /__drafts          the control panel
 *   POST /__drafts/toggle   {collection, id, draft} → rewrite one frontmatter line
 *
 * Three things keep this out of production and out of reach:
 *
 *   - `apply` restricts the plugin to a dev server started by
 *     `npm run dev:drafts`. `astro build` never loads it, so there is nothing
 *     in dist/ to strip.
 *   - Anything that is not the loopback interface is refused. `astro dev --host`
 *     puts the dev server on the LAN, and this writes to disk.
 *   - The target path is rebuilt from a whitelisted collection plus an id and
 *     then checked to be inside that collection's directory, so no id can
 *     escape the content tree.
 */
import fs from 'node:fs';
import path from 'node:path';

/** The only files this is ever allowed to touch. */
const COLLECTIONS = {
  work: { dir: 'src/content/work', ext: '.md', label: 'Plates', href: (id) => `/work/${leaf(id)}/` },
  writing: { dir: 'src/content/writing', ext: '.md', label: 'Field notes', href: (id) => `/writing/${leaf(id)}/` },
  series: { dir: 'src/content/series', ext: '.yaml', label: 'Series', href: (id) => `/series/${id}/` },
};

/** Mirrors slugOf() in src/utils.ts: authoring folders never reach the URL. */
const leaf = (id) => id.split('/').pop();

const DRAFT_LINE = /^draft:[ \t]*(?:true|false)[ \t]*$/m;
const TITLE_LINE = /^title:[ \t]*(.+?)[ \t]*$/m;

/**
 * Flip `draft:` in place, one line. Parsing the YAML and dumping it back would
 * reformat the whole block — quote styles, key order, the folded `>-`
 * descriptions in the series files — and turn a one-bit change into a diff
 * nobody can review.
 */
export function setDraft(source, value) {
  const fm = source.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (fm) {
    const [whole, open, block, close] = fm;
    return source.slice(0, fm.index) + open + flip(block, value) + close + source.slice(fm.index + whole.length);
  }
  // A bare YAML manifest: the whole file is the frontmatter.
  return `${flip(source.replace(/\s*$/, ''), value)}\n`;
}

function flip(block, value) {
  return DRAFT_LINE.test(block)
    ? block.replace(DRAFT_LINE, `draft: ${value}`)
    : `${block}\ndraft: ${value}`;
}

/** The frontmatter block, whether it is fenced (.md) or the file itself (.yaml). */
function frontmatter(source) {
  const fm = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return fm ? fm[1] : source;
}

function readEntry(root, collection, id) {
  const file = resolveFile(root, collection, id);
  if (!file) return null;
  const block = frontmatter(fs.readFileSync(file, 'utf-8'));
  const title = block.match(TITLE_LINE)?.[1]?.replace(/^['"]|['"]$/g, '') ?? id;
  // The schemas all default `draft` to false, so a missing flag means published.
  return { id, title, draft: /^draft:[ \t]*true[ \t]*$/m.test(block) };
}

/** collection + id → an absolute path, or null if it is not somewhere it may write. */
function resolveFile(root, collection, id) {
  const spec = COLLECTIONS[collection];
  if (!spec) return null;
  if (typeof id !== 'string' || !/^[\w-]+(?:\/[\w-]+)*$/.test(id)) return null;
  const dir = path.resolve(root, spec.dir);
  const file = path.resolve(dir, id + spec.ext);
  if (!file.startsWith(dir + path.sep)) return null;
  return fs.existsSync(file) ? file : null;
}

/** Every content id in a collection, as the glob loader derives them. */
function listIds(root, collection) {
  const spec = COLLECTIONS[collection];
  const dir = path.resolve(root, spec.dir);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { recursive: true })
    .map((f) => String(f).split(path.sep).join('/'))
    .filter((f) => f.endsWith(spec.ext))
    .map((f) => f.slice(0, -spec.ext.length))
    .sort();
}

const isLoopback = (req) => {
  const addr = req.socket?.remoteAddress ?? '';
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
};

const send = (res, code, body, type = 'application/json') => {
  res.statusCode = code;
  res.setHeader('content-type', `${type}; charset=utf-8`);
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
};

export default function draftTools() {
  let root = process.cwd();

  return {
    name: 'field-guide:draft-tools',
    // The gate: dev server only, and only when started with --mode drafts.
    apply: (_config, env) => env.command === 'serve' && process.env.DRAFT_MODE === '1',

    configResolved(config) {
      root = config.root ?? root;
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        if (url !== '/__drafts' && url !== '/__drafts/toggle') return next();
        if (!isLoopback(req)) return send(res, 403, { error: 'draft tools are loopback-only' });

        if (url === '/__drafts' && req.method === 'GET') {
          return send(res, 200, panel(root), 'text/html');
        }

        if (url === '/__drafts/toggle' && req.method === 'POST') {
          let body = '';
          req.on('data', (c) => {
            body += c;
            if (body.length > 4096) req.destroy();
          });
          req.on('end', () => {
            let payload;
            try {
              payload = JSON.parse(body);
            } catch {
              return send(res, 400, { error: 'expected a JSON body' });
            }
            const { collection, id, draft } = payload ?? {};
            if (typeof draft !== 'boolean') return send(res, 400, { error: 'draft must be a boolean' });
            const file = resolveFile(root, collection, id);
            if (!file) return send(res, 404, { error: `no such entry: ${collection}/${id}` });

            const before = fs.readFileSync(file, 'utf-8');
            const after = setDraft(before, draft);
            if (after !== before) fs.writeFileSync(file, after, 'utf-8');
            const rel = path.relative(root, file);
            console.log(`[drafts] ${draft ? 'drafted' : 'published'} ${rel}`);
            return send(res, 200, { ok: true, file: rel, draft });
          });
          return;
        }

        return send(res, 405, { error: 'method not allowed' });
      });

      const url = `http://localhost:${server.config.server.port ?? 4321}/__drafts`;
      server.httpServer?.once('listening', () => {
        setTimeout(() => console.log(`\n  \x1b[33mdraft mode\x1b[0m  control panel at ${url}\n`), 120);
      });
    },
  };
}

/* ---------------------------------------------------------------------------
   The panel. Deliberately looks like a tool rather than like the site, so it
   is never mistaken for a page you are auditioning.
   --------------------------------------------------------------------------- */

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function panel(root) {
  const sections = Object.entries(COLLECTIONS)
    .map(([collection, spec]) => {
      const entries = listIds(root, collection)
        .map((id) => readEntry(root, collection, id))
        .filter(Boolean);
      const drafts = entries.filter((e) => e.draft).length;
      const rows = entries
        .map(
          (e) => `
      <tr data-collection="${collection}" data-id="${esc(e.id)}" data-draft="${e.draft}">
        <td><button class="flag ${e.draft ? 'is-draft' : 'is-live'}">${e.draft ? 'draft' : 'live'}</button></td>
        <td class="t">${esc(e.title)}</td>
        <td class="p">${esc(e.id)}${esc(spec.ext)}</td>
        <td class="v"><a href="${esc(spec.href(e.id))}">view &rarr;</a></td>
      </tr>`,
        )
        .join('');
      return `<section>
    <h2>${esc(spec.label)} <span class="count">${drafts} draft${drafts === 1 ? '' : 's'} of ${entries.length}</span></h2>
    <table>${rows}</table>
  </section>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Draft mode</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  :root { color-scheme: dark; --ink:#0a0c0f; --ink-2:#11141a; --hair:#262b35; --silver:#d6dbe1; --mid:#7d8593; --signal:#d2823e; --live:#5ec6cb; }
  * { box-sizing:border-box; margin:0; }
  body { background:var(--ink); color:var(--silver); font:14px/1.5 ui-monospace,'JetBrains Mono',Menlo,monospace; padding:2.5rem 1.5rem 5rem; }
  main { max-width:60rem; margin:0 auto; }
  h1 { font-size:1.1rem; letter-spacing:.22em; text-transform:uppercase; color:var(--signal); font-weight:600; }
  .lede { color:var(--mid); margin-top:.7rem; max-width:60ch; line-height:1.65; }
  .lede code { color:var(--silver); }
  section { margin-top:2.6rem; }
  h2 { font-size:.72rem; letter-spacing:.2em; text-transform:uppercase; color:var(--mid); font-weight:500;
       border-bottom:1px solid var(--hair); padding-bottom:.6rem; display:flex; justify-content:space-between; }
  .count { color:var(--hair); }
  table { width:100%; border-collapse:collapse; }
  td { padding:.55rem .5rem; border-bottom:1px solid var(--hair); vertical-align:middle; }
  td:first-child { width:5.5rem; padding-left:0; }
  .t { color:var(--silver); }
  .p { color:var(--mid); font-size:.78rem; text-align:right; white-space:nowrap; }
  .v { width:5rem; text-align:right; padding-right:0; }
  .v a { color:var(--mid); text-decoration:none; }
  .v a:hover { color:var(--signal); }
  .flag { font:inherit; font-size:.68rem; letter-spacing:.16em; text-transform:uppercase; cursor:pointer;
          width:100%; padding:.3rem 0; border-radius:2px; background:transparent; transition:filter .15s; }
  .flag:hover { filter:brightness(1.35); }
  .flag:focus-visible { outline:2px solid var(--signal); outline-offset:2px; }
  .is-draft { border:1px solid var(--signal); color:var(--signal); }
  .is-live  { border:1px solid var(--hair); color:var(--mid); }
  tr[data-busy] { opacity:.4; }
</style></head>
<body><main>
  <h1>Draft mode</h1>
  <p class="lede">Click a flag to flip it. The change is written to the file on disk as a single
  line, the dev server reloads, and nothing here exists outside <code>astro dev --mode drafts</code>.
  Every entry links out, drafts included: draft mode renders their pages too, which is the
  point of auditioning one before flipping it.</p>
${sections}
</main>
<script type="module">
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.flag');
    if (!btn) return;
    const row = btn.closest('tr');
    if (row.hasAttribute('data-busy')) return;
    row.setAttribute('data-busy', '');
    const res = await fetch('/__drafts/toggle', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        collection: row.dataset.collection,
        id: row.dataset.id,
        draft: row.dataset.draft !== 'true',
      }),
    });
    if (!res.ok) {
      row.removeAttribute('data-busy');
      const { error } = await res.json().catch(() => ({ error: res.statusText }));
      alert('Could not flip that: ' + error);
      return;
    }
    location.reload();
  });
</script>
</body></html>`;
}
