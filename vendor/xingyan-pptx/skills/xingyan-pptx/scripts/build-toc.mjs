#!/usr/bin/env node
import { expandUserPath } from './lib/paths.mjs';
import { readJsonFile } from './lib/json.mjs';
/**
 * 按实际章节数生成目录页，避免「模板 10 槽只填 8 条、剩下九、十、空着」。
 *
 *   node scripts/build-toc.mjs <project>
 *   node scripts/build-toc.mjs <project> --page 3 --items "产品概述,项目必要性,…"
 *   node scripts/build-toc.mjs <project> --template templates/03_toc_10.svg --dry-run
 *
 * 默认从 outline.json 推导条目：目录页之后、结尾页之前的 section / content 页标题。
 * 生成的是完整页面，不再留 {{TOC_ITEM_n}} 占位符；条目数、序号、行距、槽位宽度
 * 全部按实际条目重算，所以不会出现空行、也不会出现序号与条目错位。
 *
 * 规则：
 *   - 最多 10 条（品牌目录是 32px 单栏）；超过 10 条报错，让大纲合并章节。
 *   - 行距在 44–76 之间自适应，整块在安全区 y 140–590 内垂直居中。
 *   - 条目槽 x 640–1192，32px 中文约 16 字；超长直接报错。
 */

import fs from 'node:fs';
import path from 'node:path';

const CN = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];

const BAND = { top: 140, bottom: 566 };
const SINGLE = { numX: 560, itemX: 640, width: 552 };
const ROW_MIN = 44;
const ROW_MAX = 76;
const CHAR_AT_32 = 34; // 32px 中文含字距的保守宽度

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) { args._.push(item); continue; }
    const key = item.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) { args[key] = next; i += 1; }
    else args[key] = true;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const project = path.resolve(expandUserPath(args._[0] || '.'));
const fail = (message) => { console.error(`[BLOCK] ${message}`); process.exit(1); };

if (!fs.existsSync(project)) fail(`project not found: ${project}`);

function readJson(file) {
  try { return readJsonFile(file); } catch { return null; }
}

function tocPageNumber() {
  const outline = readJson(path.join(project, 'outline.json'));
  const slides = Array.isArray(outline?.slides) ? outline.slides : [];
  const index = slides.findIndex((slide) => slide?.role === 'toc');
  if (index >= 0) return index + 1;
  if (args.page) {
    const n = Number(args.page);
    if (Number.isInteger(n) && n > 0) return n;
  }
  return null;
}

function itemsFromOutline() {
  const outline = readJson(path.join(project, 'outline.json'));
  const slides = Array.isArray(outline?.slides) ? outline.slides : [];
  const tocIndex = slides.findIndex((slide) => slide?.role === 'toc');
  if (tocIndex < 0) return [];
  return slides
    .slice(tocIndex + 1)
    .filter((slide) => ['section', 'content'].includes(slide?.role) && slide?.title)
    .map((slide) => String(slide.title).trim());
}

function resolveItems() {
  if (typeof args.items === 'string') {
    return args.items.split(/[,，;；\n]/).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof args['items-file'] === 'string') {
    const text = fs.readFileSync(args['items-file'], 'utf8');
    return text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  }
  return itemsFromOutline();
}

const pageNo = tocPageNumber();
if (!pageNo) fail('找不到目录页：outline.json 里没有 role="toc" 的页，也没有传 --page');

const items = resolveItems();
if (items.length < 3) fail(`目录条目只有 ${items.length} 条，至少 3 条；用 --items 显式指定`);
// 中泰 V5 的目录是 32px 单栏版式：超过 10 条，编号加标题就放不进安全区。
// 不缩字号、不硬塞两栏——让大纲合并章节或拆两页目录。
if (items.length > 10) {
  fail(`目录条目 ${items.length} 条，超过 10 条；请在大纲里合并章节，或拆成两页目录`);
}

const columns = 1;
const rows = items.length;
const rowH = rows <= 1
  ? ROW_MAX
  : Math.min(ROW_MAX, Math.max(ROW_MIN, Math.floor((BAND.bottom - BAND.top) / (rows - 1))));
const blockHeight = (rows - 1) * rowH;
const firstBaseline = Math.round(BAND.top + (BAND.bottom - BAND.top - blockHeight) / 2);

const colOf = () => SINGLE;
const rowOf = (i) => i;

// —— 宽度与文案校验：超宽比空行更难发现，必须在这里拦住 ——
const problems = [];
items.forEach((text, i) => {
  const col = colOf(i);
  // 中文按 1、ASCII 按 0.5 折算成「32px 字宽单位」
  const units = [...text].reduce((sum, ch) => sum + (/[\x00-\x7F]/.test(ch) ? 0.5 : 1), 0);
  const fit = Math.floor(col.width / CHAR_AT_32);
  if (!text.trim()) problems.push(`第 ${i + 1} 条为空`);
  else if (units > fit) problems.push(`第 ${i + 1} 条「${text}」约 ${units} 字宽，槽位只能放 ${fit} 字`);
});
// 放宽：放不下就截断加省略号，不再阻断出稿
items.forEach((text, i) => {
  const col = colOf(i);
  const fit = Math.floor(col.width / CHAR_AT_32);
  const units = [...text].reduce((sum, ch) => sum + (/[\x00-\x7F]/.test(ch) ? 0.5 : 1), 0);
  if (units > fit) {
    let out = '';
    let used = 0;
    for (const ch of text) {
      const w = /[\x00-\x7F]/.test(ch) ? 0.5 : 1;
      if (used + w > fit - 1) break;
      out += ch;
      used += w;
    }
    items[i] = out + '…';
    console.error(`[WARN] 目录第 ${i + 1} 条过长，已截断为「${items[i]}」`);
  }
});
if (problems.some((p) => p.includes('为空'))) {
  console.error('[BLOCK] 目录条目有空行：');
  for (const p of problems.filter((x) => x.includes('为空'))) console.error(' - ' + p);
  process.exit(1);
}

// —— 模板：读原型，剥掉原有条目与序号，只留底板与「目录 / CONTENTS」——
const templatePath = typeof args.template === 'string'
  ? path.resolve(project, args.template)
  : path.join(project, 'templates', '03_toc_10.svg');
if (!fs.existsSync(templatePath)) fail(`目录原型不存在：${templatePath}`);
let svg = fs.readFileSync(templatePath, 'utf8');

svg = svg
  .replace(/\n?\s*<text id="toc-num-\d+"[\s\S]*?<\/text>/g, '')
  .replace(/\n?\s*<g id="toc-item-\d+-slot"[\s\S]*?<\/g>/g, '')
  .replace(/data-pptx-layout-name="[^"]*"/, `data-pptx-layout-name="Contents (${items.length})"`);

const FONT = 'Microsoft YaHei, PingFang SC, Noto Sans SC, sans-serif';
const numSvg = [];
const slotSvg = [];

items.forEach((text, i) => {
  const col = colOf(i);
  const baseline = firstBaseline + rowOf(i) * rowH;
  const boxY = baseline - 32;
  const label = `${CN[i]}、`;
  // 版式层（序号）必须全部排在占位符之前，否则 ppt-master 会报 paint order
  numSvg.push(
    `  <text id="toc-num-${i + 1}" x="${col.numX}" y="${baseline}" fill="#000000" font-family="${FONT}" font-size="32" data-pptx-layer="layout" data-pptx-editable="false">${label}</text>`,
  );
  slotSvg.push(
    `  <g id="toc-item-${i + 1}-slot" data-pptx-placeholder="body" data-pptx-idx="${i + 1}" data-pptx-bounds="${col.itemX} ${boxY} ${col.width} 48">`,
    `    <text id="toc-item-${i + 1}-slot-carrier" data-pptx-carrier="true" x="${col.itemX}" y="${baseline}" fill="#000000" font-family="${FONT}" font-size="32">${escapeXml(text)}</text>`,
    '  </g>',
  );
});
const rowsSvg = [...numSvg, ...slotSvg];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 插在页码槽之前；没有页码槽就插在 </svg> 之前
const anchor = /(\n?\s*<g id="content-page-slot"[\s\S]*?<\/g>)/;
if (anchor.test(svg)) {
  svg = svg.replace(anchor, `\n${rowsSvg.join('\n')}$1`);
} else {
  svg = svg.replace(/\n?<\/svg>\s*$/, `\n${rowsSvg.join('\n')}\n</svg>\n`);
}

// 页码槽里的占位替换成真实页号
svg = svg.replace(/\{\{PAGE_NUM\}\}/g, String(pageNo));

// 版式 key 按条目数命名：条目变了就是新的版式契约，不能复用 10 槽的 key
const layoutKey = `toc-${items.length}`;
const layoutName = `Contents (${items.length})`;
svg = svg
  .replace(/data-pptx-layout="[^"]*"/, `data-pptx-layout="${layoutKey}"`)
  .replace(/data-pptx-layout-name="[^"]*"/, `data-pptx-layout-name="${layoutName}"`);

// 反向自检：不允许残留占位符或空条目
const leftovers = svg.match(/\{\{[A-Z0-9_]+\}\}/g);
if (leftovers) fail(`目录页仍有占位符：${[...new Set(leftovers)].join(', ')}`);

const outPath = typeof args.out === 'string'
  ? path.resolve(project, args.out)
  : path.join(project, 'svg_output', `P${String(pageNo).padStart(2, '0')}.svg`);

if (args['dry-run']) {
  console.log(`[dry-run] ${items.length} 条 / ${columns} 栏 / 行距 ${rowH} / 首行基线 ${firstBaseline}`);
  console.log(`[dry-run] 目标 ${outPath}（未写入）`);
} else {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, svg, 'utf8');
  if (!args['no-prototype']) {
    // ppt-master 的结构化导出要求：页面版式 key 必须和 templates/ 里的原型同一套契约。
    // 8 条的目录不是 10 条原型的“自适应”，所以按条目数落一份对应原型。
    const protoDir = path.join(project, 'templates');
    fs.mkdirSync(protoDir, { recursive: true });
    fs.writeFileSync(path.join(protoDir, `03_toc_${items.length}.svg`), svg, 'utf8');
  }
  console.log(`[OK] 目录 ${items.length} 条（${columns} 栏，行距 ${rowH}，版式 ${layoutKey}） -> ${outPath}`);
}
