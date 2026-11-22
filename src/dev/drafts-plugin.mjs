/**
 * Draft mode's write side: a small HTTP surface for seeing the draft state of
 * every content file and flipping it from the browser.
 *
 *   GET  /__drafts          the control panel
 *   POST /__drafts/toggle   {collection, id, draft} → rewrite one frontmatter line
 *   POST /__drafts/fields   {collection, id, changes} → rewrite the changed keys
 *   GET  /__drafts/glyphs   every plate glyph as SVG, for the form's picker
 *
 * A fields write passes four checks before it touches disk, and fails closed:
 * the keys must exist in the collection's real Zod schema (`draft` excepted,
 * which only the toggle sets); the rewrite must `verify()` (changed keys read
 * back as asked, untouched keys read back unchanged); the result must pass that
 * schema; and any `series` or `project` reference must name an entry that
 * exists, because `reference()` alone does not check.
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

// Everything else loads lazily, inside the handlers. astro.config.mjs imports
// this module on every run, builds included, so a top-level import of the YAML
// reader or Astro's experimental container API would let a change in either
// break `astro build` over a tool that only exists in dev.
const editing = () => import('./frontmatter.mjs');

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

/**
 * Collect a JSON request body, refusing anything over `limit` bytes. An
 * oversized body is drained and discarded rather than the socket destroyed,
 * so the client gets a 413 instead of a dropped connection.
 */
function readJson(req, limit) {
  return new Promise((resolve, reject) => {
    let body = '';
    let over = false;
    req.on('data', (c) => {
      if (over) return;
      body += c;
      if (body.length > limit) {
        over = true;
        reject(Object.assign(new Error(`body over ${limit} bytes`), { status: 413 }));
      }
    });
    req.on('end', () => {
      if (over) return;
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(Object.assign(new Error('expected a JSON body'), { status: 400 }));
      }
    });
  });
}

/** A Zod field's underlying type, past any optional/default wrappers. */
function baseType(field) {
  let f = field;
  for (let depth = 0; f && depth < 8; depth++) {
    const def = f._zod?.def ?? f.def;
    if (!def) return undefined;
    if (['optional', 'default', 'nullable', 'prefault'].includes(def.type)) f = def.innerType;
    else return def.type;
  }
  return undefined;
}

/**
 * The collection's real schema, loaded through the dev server so Astro's
 * virtual modules resolve — the same contract `astro build` enforces, rather
 * than a copy of it that could drift.
 */
async function schemaFor(server, collection) {
  const { collections } = await server.ssrLoadModule('/src/content.config.ts');
  let schema = collections?.[collection]?.schema;
  if (typeof schema === 'function') schema = schema({ image: () => ({}) });
  if (!schema?.shape) throw new Error(`no object schema for ${collection}`);
  return schema;
}

/**
 * How the rest of a collection writes each of `keys` — the majority style among
 * the files that have it — so a key new to one file matches its siblings
 * (`prerequisites` as a block list, `topics` as a flow list).
 */
function houseStyle(root, collection, keys, exclude, styleIn) {
  const spec = COLLECTIONS[collection];
  const tallies = Object.fromEntries(keys.map((k) => [k, {}]));
  for (const id of listIds(root, collection)) {
    const file = path.resolve(root, spec.dir, id + spec.ext);
    if (file === exclude) continue;
    const src = fs.readFileSync(file, 'utf-8');
    for (const k of keys) {
      const st = styleIn(src, k);
      if (st) tallies[k][st] = (tallies[k][st] ?? 0) + 1;
    }
  }
  const out = {};
  for (const [k, t] of Object.entries(tallies)) {
    const best = Object.entries(t).sort((a, b) => b[1] - a[1])[0];
    if (best) out[k] = best[0];
  }
  return out;
}

/** `reference()` validates shape, not existence; this checks the target is real. */
function brokenReferences(root, collection, data) {
  const issues = [];
  const missing = (target, id) => !listIds(root, target).includes(id);
  if (collection === 'writing' && data.series?.id && missing('series', data.series.id)) {
    issues.push({ path: ['series'], message: `no series called "${data.series.id}"` });
  }
  if (collection === 'series' && data.project && missing('work', data.project)) {
    issues.push({ path: ['project'], message: `no plate called "${data.project}"` });
  }
  return issues;
}

const send = (res, code, body, type = 'application/json') => {
  res.statusCode = code;
  res.setHeader('content-type', `${type}; charset=utf-8`);
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
};

export default function draftTools() {
  let root = process.cwd();

  return {
    name: 'field-guide:draft-tools',
    // The gate: dev server only, and only when started by `npm run dev:drafts`.
    apply: (_config, env) => env.command === 'serve' && process.env.DRAFT_MODE === '1',

    configResolved(config) {
      root = config.root ?? root;
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        if (!['/__drafts', '/__drafts/toggle', '/__drafts/fields', '/__drafts/glyphs'].includes(url)) return next();
        if (!isLoopback(req)) return send(res, 403, { error: 'draft tools are loopback-only' });

        if (url === '/__drafts' && req.method === 'GET') {
          return send(res, 200, panel(root), 'text/html');
        }

        if (url === '/__drafts/toggle' && req.method === 'POST') {
          readJson(req, 4096)
            .then((payload) => {
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
            })
            .catch((e) => send(res, e.status ?? 500, { error: e.message }));
          return;
        }

        if (url === '/__drafts/glyphs' && req.method === 'GET') {
          renderGlyphs()
            .then((svgs) => send(res, 200, svgs))
            .catch((e) => send(res, 500, { error: e.message }));
          return;
        }

        if (url === '/__drafts/fields' && req.method === 'POST') {
          writeFields(req)
            .then(([code, body]) => send(res, code, body))
            .catch((e) => send(res, e.status ?? 500, { error: e.message }));
          return;
        }

        return send(res, 405, { error: 'method not allowed' });
      });

      /**
       * Each glyph rendered by Glyph.astro itself, so the picker shows the real
       * drawings without the form importing the component (and with it, its
       * scoped CSS into every production page).
       */
      async function renderGlyphs() {
        const { experimental_AstroContainer: AstroContainer } = await import('astro/container');
        const [{ default: Glyph }, { GLYPHS }] = await Promise.all([
          server.ssrLoadModule('/src/components/Glyph.astro'),
          server.ssrLoadModule('/src/consts.ts'),
        ]);
        const container = await AstroContainer.create();
        const out = {};
        for (const name of GLYPHS) {
          out[name] = await container.renderToString(Glyph, { props: { name, size: 40 } });
        }
        return out;
      }

      async function writeFields(req) {
        const { readFields, setFields, styleIn, verify } = await editing();
        const { collection, id, changes } = (await readJson(req, 64 * 1024)) ?? {};
        if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
          return [400, { error: 'changes must be an object of { key: value }' }];
        }
        const file = resolveFile(root, collection, id);
        if (!file) return [404, { error: `no such entry: ${collection}/${id}` }];

        const schema = await schemaFor(server, collection);
        const editable = Object.keys(schema.shape).filter((k) => k !== 'draft');
        const unknown = Object.keys(changes).filter((k) => !editable.includes(k));
        if (unknown.length) {
          return [400, { error: `not editable here: ${unknown.join(', ')}`, editable }];
        }
        const dateKeys = new Set(editable.filter((k) => baseType(schema.shape[k]) === 'date'));
        const order = Object.keys(schema.shape);

        const before = fs.readFileSync(file, 'utf-8');
        const after = setFields(before, changes, {
          dateKeys,
          order,
          houseStyle: houseStyle(root, collection, Object.keys(changes), file, styleIn),
        });

        // A failure here is a rewriter bug, never the author's input: refuse
        // loudly rather than write something that means a different thing.
        const problems = verify(before, after, changes);
        if (problems.length) return [500, { error: 'refusing an unsafe rewrite', problems }];

        const data = readFields(after);
        const parsed = await schema.safeParseAsync(data);
        const issues = [
          ...(parsed.success ? [] : parsed.error.issues.map((i) => ({ path: i.path, message: i.message }))),
          ...brokenReferences(root, collection, data),
        ];
        if (issues.length) return [422, { error: 'the schema rejected this', issues }];

        const rel = path.relative(root, file);
        if (after === before) return [200, { ok: true, file: rel, changed: [] }];
        fs.writeFileSync(file, after, 'utf-8');
        console.log(`[drafts] edited ${Object.keys(changes).join(', ')} in ${rel}`);
        return [200, { ok: true, file: rel, changed: Object.keys(changes) }];
      }

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
