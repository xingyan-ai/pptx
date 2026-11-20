#!/usr/bin/env node
import { expandUserPath } from './lib/paths.mjs';
import { readJsonFile } from './lib/json.mjs';
/**
 * 确定性页面合成器：outline.json + 整页原型 → svg_output/P01..PNN.svg
 *
 * 设计目标：
 * - 品牌模板的封面 / 项目名 / 目录 / 结尾页原样复制；
 * - 内容页按 outline 选择版式 key，把卡片 / 指标 / 表格 / 对比画进原型自带的
 *   `<g id="content-proxy">` 画布，不新增/删除任何 data-pptx-* 原子；
 * - 页面生成 0 次模型调用，结构化导出的 placeholder 契约天然一致。
 *
 *   node scripts/compose-deck.mjs <project>
 *   node scripts/compose-deck.mjs <project> --check
 *   node scripts/compose-deck.mjs <project> --only P07
 *   node scripts/compose-deck.mjs <project> --json
 *
 * 页面版式由 slide.template 指定；缺省时按 role / 内容形态推断：
 *   cover / title / toc / section / ending / summary / structure / two_content
 *   cards-3 / table / metrics-4 / metrics-compare / table-metrics / content-rich
 *
 * 内容数据可直接写在 slide 上：
 *   cards:   [{ head, body, footer }]
 *   metrics: [{ value, unit, label, note }]
 *   table:   { columns: [{ label, width }], rows: [[...]] }
 *   compare: { left: { head, lines }, right: { head, lines } }
 *   layers:  [{ name, text }]            // structure
 *   takeaway: "..."                       // 结论条
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(HERE, '..');

const args = { _: [] };
for (let i = 2; i < process.argv.length; i += 1) {
  const item = process.argv[i];
  if (!item.startsWith('--')) { args._.push(item); continue; }
  const key = item.slice(2);
  const next = process.argv[i + 1];
  if (next && !next.startsWith('--')) { args[key] = next; i += 1; }
  else args[key] = true;
}

const project = path.resolve(expandUserPath(args._[0] || '.'));
const only = args.only ? String(args.only).toUpperCase().padStart(2, '0') : null;
const checkOnly = Boolean(args.check);
const jsonOut = Boolean(args.json);
const force = Boolean(args.force);

const say = (...a) => { if (!jsonOut) console.log(...a); };
const fail = (msg) => { console.error(`[BLOCK] ${msg}`); process.exit(1); };

const outlinePath = path.join(project, 'outline.json');
if (!fs.existsSync(outlinePath)) fail(`没有 outline.json：${outlinePath}`);
const outline = readJsonFile(outlinePath);
if (outline.status !== 'confirmed' && !force) {
  fail('outline.json status 不是 confirmed；确认大纲后再合成页面（--force 可跳过）');
}
const slides = Array.isArray(outline.slides) ? outline.slides : [];
if (!slides.length) fail('outline.json 没有 slides');

const templatesDir = path.join(project, 'templates');
if (!fs.existsSync(templatesDir)) fail(`没有 templates/：先跑 apply_template 装入品牌母版`);
const outDir = path.join(project, 'svg_output');

function readBrandMeta() {
  const candidates = [
    path.join(project, 'template.json'),
    path.join(SKILL_DIR, 'templates', 'brand', 'zhongtai-v5', 'template.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try { return readJsonFile(p); } catch { /* ignore */ }
    }
  }
  return null;
}
const brandMeta = readBrandMeta();

// ── 版式 key → 原型文件 ───────────────────────────────────────────────
const PROTOTYPES = {
  cover: '01_cover.svg',
  title: '02_title.svg',
  section: '04s_section.svg',
  ending: '05_ending.svg',
  content: '04_content.svg',
  'two-content': '04b_two_content.svg',
  two_content: '04b_two_content.svg',
  summary: '04t_summary.svg',
  structure: '04u_structure.svg',
  'cards-3': '04c_cards3.svg',
  table: '04c_table.svg',
  'metrics-4': '04c_metrics4.svg',
  'metrics-compare': '04c_metricscompare.svg',
  'table-metrics': '04c_tablemetrics.svg',
  'content-rich': '04c_contentrich.svg',
};

function normalizeTemplate(value) {
  if (!value) return null;
  const raw = String(value).replace(/\.svg$/i, '');
  const alias = {
    '04c_cards3': 'cards-3',
    '04c_table': 'table',
    '04c_metrics4': 'metrics-4',
    '04c_metricscompare': 'metrics-compare',
    '04c_tablemetrics': 'table-metrics',
    '04c_contentrich': 'content-rich',
    '04t_summary': 'summary',
    '04u_structure': 'structure',
    '04b_two_content': 'two-content',
    '04_content': 'content',
    '01_cover': 'cover',
    '02_title': 'title',
    '04s_section': 'section',
    '05_ending': 'ending',
  };
  return alias[raw] || raw;
}

function inferTemplate(slide) {
  const explicit = normalizeTemplate(slide.template);
  if (explicit) return explicit;
  if (slide.role === 'cover') return 'cover';
  if (slide.role === 'toc') return 'toc';
  if (slide.role === 'ending') return 'ending';
  if (slide.role === 'section') {
    return /title|项目名|project/i.test(String(slide.id)) ? 'title' : 'section';
  }
  if (slide.table && slide.metrics) return 'table-metrics';
  if (slide.table) return 'table';
  if (slide.metrics && slide.compare) return 'metrics-compare';
  if (slide.metrics) return 'metrics-4';
  if (slide.cards) return 'cards-3';
  if (/架构|分层|结构/.test(String(slide.title))) return 'structure';
  if (/对比|方案/.test(String(slide.title)) && slide.compare) return 'metrics-compare';
  return 'cards-3';
}

// ── 文本工具 ─────────────────────────────────────────────────────────
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function widthOf(text) {
  let w = 0;
  for (const ch of String(text ?? '')) w += ch.codePointAt(0) <= 0x7f ? 0.55 : 1;
  return w;
}

function truncate(text, maxUnits) {
  const t = String(text ?? '');
  if (widthOf(t) <= maxUnits) return t;
  let out = '';
  let w = 0;
  for (const ch of t) {
    const cw = ch.codePointAt(0) <= 0x7f ? 0.55 : 1;
    if (w + cw > maxUnits - 1) break;
    out += ch; w += cw;
  }
  return out + '…';
}

function wrap(text, maxUnits) {
  const out = [];
  let line = '';
  let w = 0;
  for (const ch of String(text ?? '')) {
    const cw = ch.codePointAt(0) <= 0x7f ? 0.55 : 1;
    if (w + cw > maxUnits && line) { out.push(line); line = ''; w = 0; }
    line += ch; w += cw;
  }
  if (line) out.push(line);
  return out;
}

function headOf(text) {
  const t = String(text ?? '').trim();
  const m = /^([^：:，,。；;]{2,10})[：:，,。；;]/.exec(t);
  return m ? m[1] : truncate(t, 8);
}
// ── 原型与页面 ───────────────────────────────────────────────────────
function readPrototype(file) {
  const p = path.join(templatesDir, file);
  if (!fs.existsSync(p)) fail(`缺少原型 templates/${file}`);
  return fs.readFileSync(p, 'utf8');
}

function fillToken(svg, token, value) {
  return svg.split(`{{${token}}}`).join(esc(value));
}

function fillLines(svg, token, lines, x, lineH) {
  const replacement = lines.map((ln, i) =>
    `<tspan x="${x}" dy="${i === 0 ? 0 : lineH}">${esc(ln)}</tspan>`).join('');
  return svg.split(`{{${token}}}`).join(replacement);
}

function fillProxy(svg, content) {
  const re = /<g id="content-proxy">\s*<\/g>/;
  if (!re.test(svg)) fail('原型没有空的 <g id="content-proxy"></g> 画布');
  return svg.replace(re, `<g id="content-proxy">\n${content}\n  </g>`);
}

// ── 数据推导（没有显式 cards/metrics/table 时从 points 兜底）──────────
function stripHeadPrefix(head, text) {
  const t = String(text ?? '');
  if (!head || !t.startsWith(head)) return t;
  return t.slice(head.length).replace(/^[：:，,。；;]\s*/, '');
}

function fallbackCards(slide) {
  const points = Array.isArray(slide.points) ? slide.points.filter(Boolean) : [];
  if (slide.cards) {
    const cards = slide.cards.map((c) => {
      if (typeof c === 'string') return { head: headOf(c), body: [stripHeadPrefix(headOf(c), c)] };
      const head = c.head || headOf(c.body);
      const body = Array.isArray(c.body) ? c.body : [c.body || ''];
      return { head, body: body.map((b) => stripHeadPrefix(head, b)), footer: c.footer };
    });
    const evidence = Array.isArray(slide.evidence)
      ? slide.evidence.filter(Boolean)
      : (slide.evidence ? [slide.evidence] : []);
    cards.forEach((card, index) => {
      const item = evidence[index];
      const bodyText = card.body.join(' ');
      if (item && bodyText.length < 80 && !bodyText.includes(String(item).slice(0, 8))) {
        card.body.push(item);
      }
    });
    return cards;
  }
  const items = points.length ? points : [slide.coreMessage || slide.title || ''];
  const groups = [];
  const per = Math.ceil(items.length / 3);
  for (let i = 0; i < 3; i += 1) {
    const slice = items.slice(i * per, (i + 1) * per);
    if (!slice.length) {
      groups.push({ head: i === 0 ? (slide.coreMessage || '核心判断') : '要点', body: [''] });
      continue;
    }
    const head = headOf(slice[0]);
    groups.push({
      head,
      body: slice.map((p) => stripHeadPrefix(head, p)),
    });
  }
  return groups;
}

function fallbackMetrics(slide) {
  if (slide.metrics) return slide.metrics;
  const text = [slide.soWhat, ...(slide.evidence || []), ...(slide.points || [])].join(' ');
  const found = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(ms|毫秒|G|核|张|%|秒|s|QPS)?/g)]
    .map((m) => ({ value: m[1], unit: m[2] || '', label: '', note: '' }))
    .slice(0, 4);
  return found.length >= 3 ? found : null;
}

function fallbackTable(slide) {
  if (slide.table) return slide.table;
  const points = Array.isArray(slide.points) ? slide.points.filter(Boolean) : [];
  if (points.length < 2) return null;
  return {
    columns: [{ label: '要点' }, { label: '说明' }],
    rows: points.map((p, i) => [`${i + 1}`, p]),
  };
}

function fallbackCompare(slide) {
  if (slide.compare) return slide.compare;
  const points = Array.isArray(slide.points) ? slide.points.filter(Boolean) : [];
  const half = Math.ceil(points.length / 2);
  return {
    left: { head: '方案 A', lines: points.slice(0, half) },
    right: { head: '方案 B', lines: points.slice(half) },
  };
}

// ── 渲染器 ───────────────────────────────────────────────────────────
const FONT = 'Microsoft YaHei, PingFang SC, Noto Sans SC, sans-serif';
const BRAND = '#B20017';
const LINE = '#D9D9D9';
const INK = '#000000';
const MUTED = '#595959';
const WHITE = '#FFFFFF';

function rect(x, y, w, h, fill = WHITE, stroke = LINE, extra = '') {
  const s = stroke ? ` stroke="${stroke}" stroke-width="1"` : '';
  return `    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${s}${extra}/>`;
}

function text(x, y, value, { size = 19, fill = INK, weight = 400, anchor = null } = {}) {
  const a = anchor ? ` text-anchor="${anchor}"` : '';
  return `    <text x="${x}" y="${y}" fill="${fill}" font-family="${FONT}" font-size="${size}" font-weight="${weight}"${a}>${esc(value)}</text>`;
}

function renderCards(cards, { width, y = 120, height = null, gap = 19, bodyLine = 38, maxLines = 6 } = {}) {
  const n = cards.length;
  const total = 1145;
  const w = width || (n === 2 ? 560 : n === 3 ? 368 : Math.floor((total - (n - 1) * gap) / n));
  const x0 = 67;
  const chars = Math.max(8, Math.floor(w / 22));
  const bodies = cards.map((card) => {
    const bodyText = Array.isArray(card.body) ? card.body.join(' ') : String(card.body || '');
    return wrap(bodyText, chars).slice(0, maxLines);
  });
  const maxBody = Math.max(1, ...bodies.map((lines) => lines.length));
  const h = height || Math.min(380, Math.max(240, 132 + maxBody * bodyLine + 24));
  const out = [];
  cards.forEach((card, i) => {
    const x = x0 + i * (w + gap);
    out.push(rect(x, y, w, h));
    out.push(rect(x, y, w, 4, BRAND, null));
    out.push(text(x + 20, y + 56, truncate(card.head || '', Math.floor(w / 21)), { size: 21, fill: BRAND, weight: 700 }));
    bodies[i].forEach((ln, j) => out.push(text(x + 20, y + 102 + j * bodyLine, ln, { size: 19 })));
    if (card.footer) out.push(text(x + 20, y + h - 24, truncate(card.footer, Math.floor(w / 14)), { size: 14, fill: MUTED }));
  });
  return out.join('\n');
}

function cardsHeight(cards, width) {
  const n = cards.length;
  const w = width || (n === 2 ? 560 : n === 3 ? 368 : Math.floor((1145 - (n - 1) * 19) / n));
  const chars = Math.max(8, Math.floor(w / 22));
  const maxBody = Math.max(1, ...cards.map((card) => {
    const body = Array.isArray(card.body) ? card.body.join(' ') : String(card.body || '');
    return wrap(body, chars).slice(0, 6).length;
  }));
  return Math.min(380, Math.max(240, 132 + maxBody * 38 + 24));
}

function renderMetrics(metrics, { y = 140, height = 180 } = {}) {
  const n = Math.max(2, Math.min(4, metrics.length));
  const gap = 19;
  const w = Math.floor((1145 - (n - 1) * gap) / n);
  const out = [];
  const pxAt = (text, size) => {
    let px = 0;
    for (const ch of String(text ?? '')) px += ch.codePointAt(0) <= 0x7f ? size * 0.55 : size;
    return px;
  };
  for (let i = 0; i < n; i += 1) {
    const m = metrics[i] || {};
    const x = 67 + i * (w + gap);
    const value = truncate(m.value || '', 5);
    out.push(rect(x, y, w, height));
    out.push(text(x + 20, y + 90, value, { size: 60, fill: BRAND, weight: 700 }));
    if (m.unit) {
      const unitX = x + 20 + pxAt(value, 60) + 8;
      out.push(text(unitX, y + 90, truncate(m.unit, 4), { size: 21, fill: BRAND }));
    }
    out.push(text(x + 20, y + 136, truncate(m.label || '', Math.floor(w / 19)), { size: 19 }));
    if (m.note) out.push(text(x + 20, y + 166, truncate(m.note, Math.floor(w / 11)), { size: 14, fill: MUTED }));
  }
  return out.join('\n');
}

function renderTable(table, { y = 140, rowH = 44, columns, rows } = {}) {
  const cols = columns || table.columns || [];
  const data = rows || table.rows || [];
  if (!cols.length) fail('table 版式缺少 columns');
  const totalW = 1145;
  const widths = cols.map((c) => Number(c.width) || Math.floor(totalW / cols.length));
  const sum = widths.reduce((a, b) => a + b, 0);
  if (sum > totalW) fail(`table 列宽合计 ${sum} > ${totalW}`);
  const maxRows = Math.floor((576 - y - rowH) / rowH);
  if (data.length > maxRows) fail(`table 行数 ${data.length} 超过上限 ${maxRows}（底边会越过安全区）`);

  const out = [];
  let x = 67;
  cols.forEach((c, i) => {
    out.push(`    <rect x="${x}" y="${y}" width="${widths[i]}" height="${rowH}" fill="${BRAND}" stroke="${BRAND}" stroke-width="1"/>`);
    out.push(text(x + 12, y + 30, truncate(c.label || '', Math.floor(widths[i] / 21)), { size: 19, fill: WHITE, weight: 700 }));
    x += widths[i];
  });
  data.forEach((row, ri) => {
    const ry = y + (ri + 1) * rowH;
    let cx = 67;
    widths.forEach((w, ci) => {
      out.push(rect(cx, ry, w, rowH, WHITE, LINE));
      out.push(text(cx + 12, ry + 30, truncate(row[ci] || '', Math.floor(w / 21)), { size: 19 }));
      cx += w;
    });
  });
  return out.join('\n');
}

function renderCompare(compare, { y = 300, height = 240 } = {}) {
  const blocks = [
    { ...compare.left, x: 67, fill: BRAND },
    { ...compare.right, x: 652, fill: INK },
  ];
  const out = [];
  blocks.forEach((b) => {
    out.push(rect(b.x, y, 560, height));
    out.push(rect(b.x, y, 560, 44, b.fill, null));
    out.push(text(b.x + 20, y + 30, truncate(b.head || '', 14), { size: 21, fill: WHITE, weight: 700 }));
    const lines = (b.lines || []).flatMap((ln) => wrap(ln, 24)).slice(0, 5);
    lines.forEach((ln, i) => out.push(text(b.x + 20, y + 80 + i * 34, ln, { size: 19 })));
  });
  return out.join('\n');
}

function renderStructure(layers, evidence = []) {
  const out = [];
  layers.forEach((layer, i) => {
    const y = 130 + i * 92;
    out.push(rect(120, y, 1000, 72, WHITE, LINE));
    out.push(`    <rect x="120" y="${y}" width="6" height="72" fill="${BRAND}"/>`);
    out.push(text(150, y + 44, truncate(layer.name || '', 8), { size: 21, fill: BRAND, weight: 700 }));
    out.push(text(280, y + 43, truncate(layer.text || '', 42), { size: 19, fill: '#333333' }));
    if (evidence[i]) out.push(text(280, y + 64, truncate(evidence[i], 62), { size: 14, fill: MUTED }));
  });
  return out.join('\n');
}

// ── 页面装配 ─────────────────────────────────────────────────────────
const CN = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];
const contentSlides = slides.filter((s) => s.role === 'content');
const chapterOf = new Map();
contentSlides.forEach((s, i) => chapterOf.set(s.id, `${CN[i] || (i + 1)}、`));

const report = [];
const errors = [];
const warnings = [];

function addError(page, msg) { errors.push(`${page}: ${msg}`); }
function addWarning(page, msg) { warnings.push(`${page}: ${msg}`); }

function planPage(slide, index) {
  const pageNo = index + 1;
  const page = `P${String(pageNo).padStart(2, '0')}`;
  const key = inferTemplate(slide);
  if (key === 'toc') return { page, key: 'toc', skip: true };
  if (!PROTOTYPES[key]) fail(`${page} (${slide.id}) 的版式 key '${key}' 没有原型`);
  return { page, key, file: PROTOTYPES[key] };
}

function composePage(slide, plan) {
  const { page, key, file } = plan;
  let svg = readPrototype(file);
  const pageNo = Number(page.slice(1));
  const chapter = chapterOf.get(slide.id) || '';

  // 通用 token
  if (svg.includes('{{CHAPTER}}')) svg = fillToken(svg, 'CHAPTER', chapter);
  if (svg.includes('{{PAGE_TITLE}}')) svg = fillToken(svg, 'PAGE_TITLE', slide.title || '');
  if (svg.includes('{{PAGE_NUM}}')) svg = fillToken(svg, 'PAGE_NUM', String(pageNo));

  if (key === 'cover') {
    report.push({ page, key, shapes: 0, note: '封面原样复制' });
    return svg;
  }

  if (key === 'title') {
    svg = fillToken(svg, 'PROJECT_NAME', truncate(slide.title || outline.contract?.projectName || '', 16));
    svg = fillToken(svg, 'PROJECT_NO', truncate(slide.projectNo || '项目编号：待填写', 28));
    svg = fillToken(svg, 'DEPARTMENT', truncate(slide.department || '申报部门：待填写', 28));
    svg = fillToken(svg, 'DATE', slide.date || '2026 年 11 月');
    report.push({ page, key, shapes: 0 });
    return svg;
  }

  if (key === 'section') {
    svg = fillToken(svg, 'SECTION_NO', chapter || '');
    svg = fillToken(svg, 'SECTION_TITLE', truncate(slide.title || '', 18));
    svg = fillToken(svg, 'SECTION_SUB', truncate(slide.coreMessage || '', 28));
    report.push({ page, key, shapes: 0 });
    return svg;
  }

  if (key === 'ending') {
    svg = fillToken(svg, 'CLOSING_TEXT', truncate(slide.coreMessage || '谢谢聆听', 14));
    report.push({ page, key, shapes: 0 });
    return svg;
  }

  if (key === 'summary') {
    const cards = fallbackCards(slide).slice(0, 3);
    for (let i = 1; i <= 3; i += 1) {
      const c = cards[i - 1] || {};
      svg = fillToken(svg, `SUMMARY_${i}_HEAD`, truncate(c.head || '', 12));
      const bodyText = Array.isArray(c.body) ? c.body.join(' ') : String(c.body || '');
      const lines = wrap(bodyText, 15).slice(0, 7);
      svg = fillLines(svg, `SUMMARY_${i}_BODY`, lines, 91 + (i - 1) * 389, 30);
    }
    svg = fillToken(svg, 'TAKEAWAY', truncate(slide.takeaway || (slide.evidence || [])[0] || slide.soWhat || '', 46));
    report.push({ page, key, shapes: 3 });
    return svg;
  }

  if (key === 'structure') {
    const evidence = Array.isArray(slide.evidence)
      ? slide.evidence.filter(Boolean)
      : (slide.evidence ? [slide.evidence] : []);
    if (Array.isArray(slide.layers) && slide.layers.length) {
      const inner = renderStructure(slide.layers, evidence);
      const re = /<g id="structure-content">[\s\S]*?<\/g>/;
      if (re.test(svg)) svg = svg.replace(re, `<g id="structure-content">\n${inner}\n    </g>`);
      else svg = fillProxy(svg, inner);
    }
    if (slide.source) {
      svg = svg.replace('</svg>', `  ${text(67, 560, '来源：' + truncate(slide.source, 58), { size: 14, fill: MUTED })}\n</svg>`);
    }
    svg = fillToken(svg, 'TAKEAWAY', truncate(slide.takeaway || slide.soWhat || '', 46));
    report.push({ page, key, shapes: (slide.layers || []).length || 3 });
    return svg;
  }

  if (key === 'two-content' || key === 'two_content') {
    const cmp = fallbackCompare(slide);
    const left = [cmp.left?.head, ...(cmp.left?.lines || [])].filter(Boolean).join(' ');
    const right = [cmp.right?.head, ...(cmp.right?.lines || [])].filter(Boolean).join(' ');
    svg = fillLines(svg, 'LEFT_TEXT', wrap(left, 26).slice(0, 9), 67, 40);
    svg = fillLines(svg, 'RIGHT_VISUAL', wrap(right, 26).slice(0, 9), 639, 40);
    report.push({ page, key, shapes: 2 });
    return svg;
  }

  if (key === 'content') {
    const points = Array.isArray(slide.points) ? slide.points : [];
    const lines = points.flatMap((p) => wrap(`· ${p}`, 52)).slice(0, 10);
    if (!lines.length) addError(page, 'content 版式没有 points');
    svg = fillLines(svg, 'CONTENT_AREA', lines, 67, 40);
    report.push({ page, key, shapes: 0, textLines: lines.length });
    return svg;
  }

  // ── proxy 版式 ──
  if (key === 'cards-3') {
    const cards = fallbackCards(slide).slice(0, 4);
    if (cards.length < 2) addError(page, 'cards-3 至少需要 2 张卡');
    let content = renderCards(cards);
    const take = slide.takeaway || slide.soWhat;
    const h = cardsHeight(cards);
    const barY = 120 + h + 16;
    let hasBar = false;
    if (take && barY + 64 <= 560) {
      content += `\n${rect(67, barY, 1145, 64, BRAND, null)}`;
      content += `\n${text(87, barY + 44, truncate(take, 46), { size: 21, fill: WHITE, weight: 700 })}`;
      hasBar = true;
    } else if (take) {
      addWarning(page, '卡片区已占满，soWhat/takeaway 未渲染');
    }
    const sourceY = hasBar ? barY + 64 + 18 : 120 + h + 18;
    if (slide.source && sourceY <= 572) {
      content += `\n${text(67, sourceY, '来源：' + truncate(slide.source, 58), { size: 14, fill: MUTED })}`;
    }
    svg = fillProxy(svg, content);
    report.push({ page, key, shapes: cards.length * 3 + (hasBar ? 1 : 0) });
    return svg;
  }

  if (key === 'metrics-4') {
    const metrics = fallbackMetrics(slide);
    if (!metrics || metrics.length < 3) addError(page, 'metrics-4 需要至少 3 个指标（slide.metrics 或含数字的 points/evidence）');
    let content = metrics ? renderMetrics(metrics) : '';
    const take = slide.takeaway || slide.soWhat;
    let hasBar = false;
    if (take) {
      content += `\n${rect(67, 360, 1145, 64, BRAND, null)}`;
      content += `\n${text(87, 404, truncate(take, 46), { size: 21, fill: WHITE, weight: 700 })}`;
      hasBar = true;
    }
    if (slide.source) {
      const sourceY = hasBar ? 442 : 340;
      if (sourceY <= 572) content += `\n${text(67, sourceY, '来源：' + truncate(slide.source, 58), { size: 14, fill: MUTED })}`;
    }
    const evidence = Array.isArray(slide.evidence) ? slide.evidence.filter(Boolean) : (slide.evidence ? [slide.evidence] : []);
    if (evidence.length) {
      const evY = hasBar ? 466 : 360;
      wrap(evidence.join(' · '), 60).slice(0, 2).forEach((line, i) => {
        if (evY + i * 20 <= 572) content += `\n${text(67, evY + i * 20, line, { size: 14, fill: MUTED })}`;
      });
    }
    svg = fillProxy(svg, content);
    report.push({ page, key, shapes: (metrics || []).length + (hasBar ? 1 : 0) });
    return svg;
  }

  if (key === 'table') {
    const table = fallbackTable(slide);
    if (!table) addError(page, 'table 版式缺少表格数据');
    let content = table ? renderTable(table) : '';
    const take = slide.takeaway || slide.soWhat;
    const rows = (table?.rows || []).length;
    const barY = 140 + 44 * (rows + 1) + 16;
    let hasBar = false;
    if (take && table) {
      if (barY + 64 <= 560) {
        content += `\n${rect(67, barY, 1145, 64, BRAND, null)}`;
        content += `\n${text(87, barY + 44, truncate(take, 46), { size: 21, fill: WHITE, weight: 700 })}`;
        hasBar = true;
      } else {
        addWarning(page, 'table 行数已占满安全区，takeaway 未渲染');
      }
    }
    if (slide.source) {
      const sourceY = hasBar ? barY + 64 + 18 : 140 + 44 * (rows + 1) + 18;
      if (sourceY <= 572) content += `\n${text(67, sourceY, '来源：' + truncate(slide.source, 58), { size: 14, fill: MUTED })}`;
    }
    svg = fillProxy(svg, content);
    report.push({ page, key, shapes: table ? 1 + rows : 0 });
    return svg;
  }

  if (key === 'metrics-compare') {
    const metrics = fallbackMetrics(slide);
    const cmp = fallbackCompare(slide);
    const evidence = Array.isArray(slide.evidence) ? slide.evidence.filter(Boolean) : (slide.evidence ? [slide.evidence] : []);
    if (evidence[0]) cmp.left.lines = [...(cmp.left.lines || []), evidence[0]];
    if (evidence[1]) cmp.right.lines = [...(cmp.right.lines || []), evidence[1]];
    const take = slide.takeaway || slide.soWhat;
    const hasMetrics = metrics && metrics.length >= 3;
    let content = '';
    if (hasMetrics) content += renderMetrics(metrics, { y: 120, height: 150 }) + '\n';
    const compareY = hasMetrics ? 300 : 140;
    const compareH = hasMetrics ? (take ? 200 : 240) : (take ? 340 : 380);
    content += renderCompare(cmp, { y: compareY, height: compareH });
    if (take) {
      const barY = compareY + compareH + 12;
      if (barY + 56 <= 572) {
        content += `\n${rect(67, barY, 1145, 56, BRAND, null)}`;
        content += `\n${text(87, barY + 38, truncate(take, 46), { size: 21, fill: WHITE, weight: 700 })}`;
      }
    }
    if (slide.source) {
      const sourceY = compareY + compareH + (take ? 74 : 18);
      if (sourceY <= 572) content += `\n${text(67, sourceY, '来源：' + truncate(slide.source, 58), { size: 14, fill: MUTED })}`;
    }
    svg = fillProxy(svg, content);
    report.push({ page, key, shapes: (metrics?.length || 0) + 2 + (take ? 1 : 0) });
    return svg;
  }

  if (key === 'table-metrics') {
    const table = fallbackTable(slide);
    const metrics = fallbackMetrics(slide);
    if (!table) addError(page, 'table-metrics 缺少表格数据');
    if (!metrics || metrics.length < 3) addError(page, 'table-metrics 缺少指标数据');
    const rows = table?.rows?.length || 0;
    const tableBottom = 120 + 44 + rows * 44;
    const metricsY = tableBottom + 24;
    const metricsH = 140;
    if (metricsY + metricsH > 576) addError(page, `table-metrics 超出安全区：tableBottom=${tableBottom}, metricsY=${metricsY}`);
    let content = table ? renderTable(table, { y: 120 }) : '';
    if (metrics) content += `\n${renderMetrics(metrics, { y: metricsY, height: metricsH })}`;
    const take = slide.takeaway || slide.soWhat;
    const barY = metricsY + metricsH + 12;
    let hasBar = false;
    if (take && barY + 56 <= 572) {
      content += `\n${rect(67, barY, 1145, 56, BRAND, null)}`;
      content += `\n${text(87, barY + 38, truncate(take, 46), { size: 21, fill: WHITE, weight: 700 })}`;
      hasBar = true;
    }
    if (slide.source) {
      const sourceY = hasBar ? barY + 56 + 16 : barY;
      if (sourceY <= 572) content += `\n${text(67, sourceY, '来源：' + truncate(slide.source, 58), { size: 14, fill: MUTED })}`;
    }
    svg = fillProxy(svg, content);
    report.push({ page, key, shapes: (rows ? 1 + rows : 0) + metrics.length });
    return svg;
  }

  if (key === 'content-rich') {
    let content = '';
    if (slide.takeaway || slide.soWhat) {
      content += rect(67, 120, 1145, 72, BRAND, null) + '\n';
      content += text(87, 166, truncate(slide.takeaway || slide.soWhat, 46), { size: 21, fill: WHITE, weight: 700 }) + '\n';
    }
    const cards = fallbackCards(slide).slice(0, 4);
    const cardsY = content ? 216 : 120;
    const cardsH = content ? 288 : 380;
    content += renderCards(cards, { y: cardsY, height: cardsH, maxLines: content ? 5 : 6 });
    if (slide.source && cardsY + cardsH + 18 <= 572) {
      content += `\n${text(67, cardsY + cardsH + 18, '来源：' + truncate(slide.source, 58), { size: 14, fill: MUTED })}`;
    }
    svg = fillProxy(svg, content);
    report.push({ page, key, shapes: cards.length * 3 + (content ? 1 : 0) });
    return svg;
  }

  fail(`${page}: 未实现的版式 '${key}'`);
  return svg;
}

function bodyTextLength(svg, slide, page) {
  const text = [...svg.matchAll(/<text[^>]*>(.*?)<\/text>/gs)]
    .map((match) => match[1].replace(/<[^>]+>/g, ''))
    .join('');
  return text.length - String(slide.title || '').length - 2 - String(Number(page.slice(1))).length;
}

// ── 执行 ────────────────────────────────────────────────────────────
const plans = slides.map(planPage).filter((p) => !p.skip).map((plan, i) => ({ plan, slide: slides.find((s, idx) => `P${String(idx + 1).padStart(2, '0')}` === plan.page) }));
const tocIndex = slides.findIndex((s) => s.role === 'toc');
const tocPage = tocIndex >= 0 ? `P${String(tocIndex + 1).padStart(2, '0')}` : null;

const rendered = [];
for (const { plan, slide } of plans) {
  if (only && plan.page !== only) continue;
  const svg = composePage(slide, plan);
  if (/\{\{[A-Z0-9_]+\}\}/.test(svg)) {
    const left = svg.match(/\{\{[A-Z0-9_]+\}\}/g);
    addError(plan.page, `仍有未替换占位符：${[...new Set(left)].join(', ')}`);
    continue;
  }
  const chars = bodyTextLength(svg, slide, plan.page);
  if (slide.role === 'content' && slide.density !== 'lean' && chars < 180) {
    addWarning(plan.page, `正文约 ${chars} 字，低于 standard 密度建议（≥180）`);
  }
  rendered.push({ page: plan.page, file: plan.file, svg, chars });
  if (checkOnly) say(`[check] ${plan.page} ${plan.key} chars=${chars} ok`);
}

if (errors.length) {
  for (const w of warnings) console.error(`[warn] ${w}`);
  for (const e of errors) console.error(`[error] ${e}`);
  console.error(`\n[BLOCK] ${errors.length} 项错误；未写任何页面`);
  process.exit(1);
}

if (!checkOnly) {
  fs.mkdirSync(outDir, { recursive: true });
  if (!only) {
    const keep = new Set(plans.map((plan) => plan.page));
    if (tocPage) keep.add(tocPage);
    for (const name of fs.readdirSync(outDir)) {
      if (/^P\d{2,}\.svg$/.test(name) && !keep.has(name.slice(0, -4))) {
        fs.unlinkSync(path.join(outDir, name));
        say(`removed stale ${name}`);
      }
    }
  }
  for (const item of rendered) {
    fs.writeFileSync(path.join(outDir, `${item.page}.svg`), item.svg);
    say(`wrote ${item.page}.svg <- ${item.file}`);
  }
}

// ── 输出 ────────────────────────────────────────────────────────────
for (const w of warnings) console.error(`[warn] ${w}`);
for (const e of errors) console.error(`[error] ${e}`);

const summary = {
  schemaVersion: 1,
  project,
  pages: report.length,
  visualPages: report.filter((r) => r.shapes > 0).length,
  warnings: warnings.length,
  errors: errors.length,
  report,
};
if (jsonOut) process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
else {
  say(`\n[summary] pages=${summary.pages} visualPages=${summary.visualPages} warnings=${summary.warnings} errors=${summary.errors}`);
  if (checkOnly) say('[check] 未写文件');
}
if (errors.length) process.exit(1);
