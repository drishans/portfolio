import temml from 'temml';

/**
 * Sätteri MDAST plugin: render `$…$` / `$$…$$` to MathML with Temml at build
 * time. Sätteri's `math` parser feature only *parses* TeX into mdast nodes —
 * without this plugin the blocks fall through to the code-block pipeline
 * (Expressive Code) as plaintext frames.
 *
 * Both node kinds are replaced with mdast `html` nodes. For INLINE math this
 * is load-bearing: the `rawHtml` escape hatch re-parses as a block and
 * shatters the paragraph around every `$…$`. Display math ends up wrapped in
 * a <p> either way — valid HTML (<math> is phrasing content) and styled by
 * the math rules, so it's left alone. `throwOnError: false` renders bad TeX
 * as visible red source instead of failing the whole build. Temml's support
 * CSS is vendored at src/styles/temml.css.
 */
const render = (tex, displayMode) =>
  temml.renderToString(tex, { displayMode, throwOnError: false });

export const temmlMath = {
  name: 'temml-math',
  math(node, ctx) {
    ctx.replaceNode(node, { type: 'html', value: render(node.value, true) });
  },
  inlineMath(node, ctx) {
    ctx.replaceNode(node, { type: 'html', value: render(node.value, false) });
  },
};

/**
 * Sätteri HAST plugin: wrap GFM tables in a scroll container so wide
 * instrument-log tables overflow-scroll on phones without putting
 * `display: block` on the <table> itself (which strips table semantics from
 * the accessibility tree in WebKit). Styled by `.table-wrap` in global.css.
 */
export const tableWrap = {
  name: 'table-wrap',
  element: {
    filter: ['table'],
    visit(node, ctx) {
      ctx.wrapNode(node, {
        type: 'element',
        tagName: 'div',
        properties: { className: ['table-wrap'] },
        children: [],
      });
    },
  },
};
