/**
 * Surgical frontmatter edits for draft mode's details form.
 *
 * The rule is the draft flip's rule, generalised: a key whose value did not
 * change keeps its exact bytes. Only the keys in `changes` are re-emitted, each
 * in the style that key already uses in this file (flow array, block list,
 * folded scalar, quoted or plain), or in the house style for a key that is new.
 *
 * js-yaml reads and checks; it never writes. Dumping the whole block would
 * restyle every key in it — requote titles, unfold the series descriptions,
 * turn `['audio', 'dsp']` into a block list — and bury a one-field edit in a
 * diff nobody can review. `verify()` is the safety net: it parses the candidate
 * back and refuses anything whose changed keys don't mean exactly what was
 * asked, or whose untouched keys moved at all.
 */
import yaml from 'js-yaml';

const KEY_LINE = /^([A-Za-z_][\w-]*)[ \t]*:/;
const FOLD_WIDTH = 76;

/* --- reading the block ------------------------------------------------------ */

/**
 * Split a content file into the frontmatter block and the bytes around it, so
 * that `head + block + tail` is always the original file exactly.
 */
export function splitFrontmatter(source) {
  const fm = source.match(/^(---\r?\n)([\s\S]*?)(\r?\n---[\s\S]*)$/);
  if (fm) return { head: fm[1], block: fm[2], tail: fm[3] };
  // A bare YAML manifest (series files): the whole file is the block.
  const bare = source.match(/^([\s\S]*?)(\s*)$/);
  return { head: '', block: bare[1], tail: bare[2] };
}

/**
 * Partition the block's lines into spans: one per top-level key (its line plus
 * every continuation line under it), and one per line that belongs to no key
 * (comments, blank separators). Every line lands in exactly one span.
 */
function spans(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const key = lines[i].match(KEY_LINE)?.[1];
    if (!key) {
      out.push({ key: null, start: i, end: i + 1 });
      i++;
      continue;
    }
    let j = i + 1;
    while (j < lines.length && continues(lines, j)) j++;
    out.push({ key, start: i, end: j });
    i = j;
  }
  return out;
}

/** An indented line, a list item, or a blank line inside an indented run. */
function continues(lines, j) {
  const line = lines[j];
  if (/^[ \t]/.test(line) || /^-(\s|$)/.test(line)) return true;
  if (line.trim() === '') {
    // Blank lines belong to the key above only when indentation resumes after
    // them (a folded scalar's paragraph break); otherwise they separate keys.
    for (let k = j + 1; k < lines.length; k++) {
      if (lines[k].trim() === '') continue;
      return /^[ \t]/.test(lines[k]);
    }
  }
  return false;
}

/** How a key's value is written in this file, so a rewrite can match it. */
function styleOf(spanLines) {
  const rest = spanLines[0].replace(KEY_LINE, '').trim();
  if (rest.startsWith('[')) return 'flow';
  if (rest.startsWith('>')) return 'folded';
  if (rest.startsWith('|')) return 'literal';
  if (rest.startsWith('"')) return 'double';
  if (rest.startsWith("'")) return 'single';
  if (rest === '' && spanLines.length > 1) {
    return spanLines[1].trimStart().startsWith('-') ? 'block-list' : 'map';
  }
  return 'plain';
}

/** The style `key` is written in within `source`, or null if it is absent. */
export function styleIn(source, key) {
  const lines = splitFrontmatter(source).block.split(/\r?\n/);
  const sp = spans(lines).find((x) => x.key === key);
  return sp ? styleOf(lines.slice(sp.start, sp.end)) : null;
}

/* --- writing one key --------------------------------------------------------- */

const double = (s) => JSON.stringify(s); // JSON string escapes are valid YAML
const single = (s) => `'${s.replace(/'/g, "''")}'`;

/** Would `s` survive as an unquoted scalar and read back as the same string? */
function plainSafe(s) {
  if (s === '' || s !== s.trim() || /[\r\n]/.test(s)) return false;
  try {
    return yaml.load(`k: ${s}`)?.k === s;
  } catch {
    return false;
  }
}

const plainOr = (s, quote) => (plainSafe(s) ? s : quote(s));

/** Greedy word wrap for a `>-` folded scalar; folding turns the breaks back into spaces. */
function fold(s, indent) {
  const words = s.split(' ');
  const rows = [];
  let row = '';
  for (const w of words) {
    if (row && indent.length + row.length + 1 + w.length > FOLD_WIDTH) {
      rows.push(indent + row);
      row = w;
    } else {
      row = row ? `${row} ${w}` : w;
    }
  }
  rows.push(indent + row);
  return rows;
}

/**
 * The lines for `key: value`, in `style` (that key's existing style in this
 * file, or null for a new key). `isDate` marks schema date fields, which the
 * repo writes bare (`pubDate: 2026-08-28`) and YAML reads as timestamps.
 */
function emit(key, value, style, isDate) {
  if (isDate && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return [`${key}: ${value}`];
  }
  if (typeof value === 'number' || typeof value === 'boolean') return [`${key}: ${value}`];

  if (Array.isArray(value)) {
    if (value.length === 0) return [`${key}: []`];
    if (style === 'block-list') {
      return [`${key}:`, ...value.map((v) => `  - ${plainOr(String(v), single)}`)];
    }
    // House style for tags/topics/stack: a flow list, every item single-quoted.
    const item = (v) => (/[\r\n]/.test(String(v)) ? double(String(v)) : single(String(v)));
    return [`${key}: [${value.map(item).join(', ')}]`];
  }

  if (value && typeof value === 'object') {
    const rows = Object.entries(value).map(([k, v]) =>
      typeof v === 'string' ? `  ${k}: ${plainOr(v, double)}` : `  ${k}: ${v}`,
    );
    return [`${key}:`, ...rows];
  }

  const s = String(value);
  // Folded and single-quoted styles cannot carry a raw newline faithfully.
  if (style === 'folded' && !/[\r\n]/.test(s) && s === s.trim() && !s.includes('  ')) {
    return [`${key}: >-`, ...fold(s, '  ')];
  }
  if (style === 'single' && !/[\r\n]/.test(s)) return [`${key}: ${single(s)}`];
  if (style === 'double') return [`${key}: ${double(s)}`];
  // Plain where it is safe; otherwise the double quotes the repo uses for titles.
  return [`${key}: ${plainOr(s, double)}`];
}

/* --- the edit ------------------------------------------------------------------ */

/**
 * Apply `changes` ({ key: value }, `null` removes an optional key) to a content
 * file and return the new source. Keys not named in `changes` are untouched.
 *
 * A key the file does not have yet is written in `houseStyle[key]` (how the
 * rest of the collection writes it) and placed by `order` (the schema's field
 * order): straight after the nearest earlier field the file does have, so
 * `updatedDate` lands under `pubDate` rather than at the bottom.
 */
export function setFields(source, changes, { dateKeys = new Set(), houseStyle = {}, order = [] } = {}) {
  const entries = Object.entries(changes);
  if (entries.length === 0) return source;

  const { head, block, tail } = splitFrontmatter(source);
  const eol = block.includes('\r\n') ? '\r\n' : '\n';
  const lines = block.split(eol);
  const parts = spans(lines).map((sp) => ({ ...sp, lines: lines.slice(sp.start, sp.end) }));

  for (const [key, value] of entries) {
    const at = parts.findIndex((p) => p.key === key);
    const remove = value === null || value === undefined;
    if (remove) {
      if (at !== -1) parts.splice(at, 1);
      continue;
    }
    const style = at === -1 ? (houseStyle[key] ?? null) : styleOf(parts[at].lines);
    const fresh = { key, lines: emit(key, value, style, dateKeys.has(key)) };
    if (at !== -1) parts[at] = fresh;
    else parts.splice(insertionPoint(parts, key, order), 0, fresh);
  }

  return head + parts.flatMap((p) => p.lines).join(eol) + tail;
}

/** Where a new key goes: after its nearest present predecessor in `order`. */
function insertionPoint(parts, key, order) {
  const rank = order.indexOf(key);
  if (rank !== -1) {
    for (let r = rank - 1; r >= 0; r--) {
      const at = parts.findIndex((p) => p.key === order[r]);
      if (at !== -1) return at + 1;
    }
    for (let r = rank + 1; r < order.length; r++) {
      const at = parts.findIndex((p) => p.key === order[r]);
      if (at !== -1) return at;
    }
  }
  // Not in the schema order (or nothing to anchor to): just above `draft:`,
  // which the repo keeps last, or after the final key.
  const draftAt = parts.findIndex((p) => p.key === 'draft');
  return draftAt !== -1 ? draftAt : parts.findLastIndex((p) => p.key !== null) + 1;
}

/* --- the safety net -------------------------------------------------------------- */

/** Read a content file's frontmatter as data. Throws on invalid YAML. */
export function readFields(source) {
  return yaml.load(splitFrontmatter(source).block) ?? {};
}

/** Dates as the form speaks them, so a written timestamp compares to its input. */
function normal(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (Array.isArray(v)) return v.map(normal);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, normal(x)]));
  }
  return v;
}

const same = (a, b) => JSON.stringify(normal(a)) === JSON.stringify(normal(b));

/**
 * Check a rewrite before it touches disk. Returns a list of problems, empty
 * when the candidate is safe to write:
 *   - it must still parse;
 *   - every changed key must read back as exactly the value asked for;
 *   - every other key must read back exactly as it did before.
 * The last check is what catches a span boundary in the wrong place.
 */
export function verify(before, candidate, changes) {
  let a, b;
  try {
    a = readFields(before);
    b = readFields(candidate);
  } catch (e) {
    return [`the rewritten frontmatter is not valid YAML: ${e.message}`];
  }
  const problems = [];
  for (const [key, want] of Object.entries(changes)) {
    const removed = want === null || want === undefined;
    if (removed ? key in b : !same(b[key], want)) {
      problems.push(`${key} would be written as ${JSON.stringify(normal(b[key]))}, not ${JSON.stringify(want)}`);
    }
  }
  for (const key of Object.keys(a)) {
    if (key in changes) continue;
    if (!same(a[key], b[key])) problems.push(`${key} changed although it was not edited`);
  }
  return problems;
}
