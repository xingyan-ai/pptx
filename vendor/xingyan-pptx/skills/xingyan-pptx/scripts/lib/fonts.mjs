import { readJsonFile } from './json.mjs';
/**
 * Font handling for Deck Studio.
 *
 * The deck source is SVG/HTML, so the rendered look depends on which fonts the
 * viewer happens to have installed. This module makes that dependency explicit:
 *
 *   - `embed`      the family ships with the skill as woff2 and is inlined into
 *                  the HTML as a data URI, so the deck looks the same everywhere
 *   - `substitute` a proprietary family (Arial Black, Calibri, Arial Narrow) is
 *                  swapped for a bundled OFL look-alike
 *   - `system`     the family stays in the stack; CJK faces are all system faces
 *                  because embedding a full CJK font is several megabytes
 *
 * PPTX is a separate case: PowerPoint on macOS does not honor embedded fonts,
 * so the tokens keep `*_stack_ppt` with Arial / PingFang / 微软雅黑 / 宋体.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const FONT_DIR = path.join(ROOT, 'assets', 'fonts');
const MAP_FILE = path.join(ROOT, 'themes', 'fonts.map.json');

export function loadFontMap() {
  if (!fs.existsSync(MAP_FILE)) return { families: {} };
  return readJsonFile(MAP_FILE);
}

const QUOTES = /["']/g;
const strip = (name) => name.trim().replace(/&quot;/g, '').replace(QUOTES, '').trim();

// Font stacks live in three places: `font-family:` declarations, CSS custom
// properties such as `--theme-font-title:` (what the HTML exporter writes), and
// SVG presentation attributes. Match all three.
const PROPERTY = /([\w-]*font[\w-]*)\s*:\s*([^;}]+)/gi;
const ATTR = /font-family\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

/** Every family name that appears in a font-family declaration of the document. */
export function familiesIn(html) {
  const found = new Set();
  const text = html.replace(/&quot;/g, '"');
  for (const re of [PROPERTY, ATTR]) {
    let match;
    while ((match = re.exec(text))) {
      const stack = match[2] || match[1] || '';
      for (const part of stack.split(',')) {
        const name = strip(part);
        // Skip sizes, `var(...)` fragments and other shorthand noise.
        if (!name || /\d/.test(name) || name.includes('(')) continue;
        found.add(name);
      }
    }
  }
  return found;
}

function dataUri(file) {
  const bytes = fs.readFileSync(path.join(FONT_DIR, file));
  return `data:font/woff2;base64,${bytes.toString('base64')}`;
}

/**
 * @returns {{css: string, embedded: string[], substituted: object[], skipped: string[]}}
 */
export function buildFontCss(families, map = loadFontMap()) {
  const css = [];
  const embedded = [];
  const substituted = [];
  const skipped = [];

  for (const family of families) {
    const entry = map.families[family];
    if (!entry) {
      skipped.push(family);
      continue;
    }
    if (entry.render === 'system') {
      skipped.push(family);
      continue;
    }
    const faceFamily = entry.substitute || family;
    if (entry.substitute) substituted.push({ from: family, to: faceFamily });
    const faces = (entry.files || [])
      .filter((file) => fs.existsSync(path.join(FONT_DIR, file.file)))
      .map((file) => {
        const uri = dataUri(file.file);
        return `@font-face{font-family:"${faceFamily}";font-style:normal;font-weight:${file.weight};font-display:block;src:url(${uri}) format("woff2");}`;
      });
    if (!faces.length) {
      skipped.push(`${family}（缺 woff2，退回系统字体）`);
      continue;
    }
    css.push(...faces);
    embedded.push(faceFamily);
  }

  return {
    css: css.join('\n'),
    embedded: [...new Set(embedded)],
    substituted,
    skipped,
  };
}

/**
 * Rewrite stacks so a substituted family is tried first, e.g.
 * `Arial Black, Arial` -> `"Archivo Black", Arial Black, Arial`.
 */
function rewriteStacks(html, substituted) {
  if (!substituted.length) return html;
  // Work on a decoded copy so quoted family names inside SVG attributes match.
  let out = html.replace(/&quot;/g, '"');
  for (const { from, to } of substituted) {
    const name = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const quoted = `(?:["']?${name}["']?)`;
    out = out.replace(PROPERTY, (whole, prop, stack) => {
      if (!new RegExp(`^\\s*${quoted}\\s*(,|$)`).test(stack)) return whole;
      const rest = stack.replace(new RegExp(`^\\s*${quoted}\\s*`), '').replace(/^,\s*/, '');
      return `${prop}: "${to}", ${from}${rest ? `, ${rest}` : ''}`;
    });
  }
  // Re-encode quotes that live inside SVG attributes.
  return out.replace(/(font-family=")([^"]*)(")/g, (whole, pre, stack, post) =>
    `${pre}${stack.replace(/"/g, '&quot;')}${post}`);
}

/**
 * Embed every embeddable family found in the document and insert the @font-face
 * block into its head. Returns the new HTML plus a report.
 */
export function embedFonts(html, options = {}) {
  const map = options.map || loadFontMap();
  const families = familiesIn(html);
  const { css, embedded, substituted, skipped } = buildFontCss(families, map);
  if (!css) return { html, report: { embedded: [], substituted: [], skipped, bytes: 0, changed: false } };

  let out = rewriteStacks(html, substituted);
  const block = `<style id="deck-fonts">\n${css}\n</style>\n`;
  if (/<\/head>/i.test(out)) out = out.replace(/<\/head>/i, `${block}</head>`);
  else out = block + out;

  return {
    html: out,
    report: {
      embedded,
      substituted,
      skipped,
      bytes: Buffer.byteLength(css, 'utf8'),
      changed: true,
    },
  };
}

/** Human-readable font plan for one theme token. */
export function themeFontReport(token, map = loadFontMap()) {
  const ty = token.typography || {};
  const rows = [];
  for (const [role, stackKey] of [['标题', 'title_stack'], ['正文', 'body_stack']]) {
    const stack = ty[stackKey] || '';
    const families = stack.split(',').map(strip).filter(Boolean);
    const first = families[0];
    const entry = map.families[first] || null;
    let outcome;
    if (!entry) outcome = '未登记（按系统字体处理）';
    else if (entry.render === 'embed') outcome = `随包内嵌 ${first}（latin 子集）`;
    else if (entry.render === 'substitute') outcome = `内嵌替代 ${entry.substitute}，原位保留 ${first}`;
    else if (entry.render === 'system') {
      outcome = entry.cjk
        ? `系统字体；缺 ${first} 时回落到栈内下一位`
        : `系统字体 ${first}`;
    }
    rows.push({
      role,
      stack,
      first,
      render: entry ? entry.render : 'unknown',
      substitutesTo: entry && entry.substitute ? entry.substitute : null,
      cjk: Boolean(entry && entry.cjk),
      outcome,
      fallbackRisk: entry && entry.render === 'system' && !entry.cjk && !['Arial', 'Georgia'].includes(first),
    });
  }
  return rows;
}
