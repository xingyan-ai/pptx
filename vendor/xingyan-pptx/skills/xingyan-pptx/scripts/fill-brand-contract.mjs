#!/usr/bin/env node
import { expandUserPath } from './lib/paths.mjs';
import { readJsonFile } from './lib/json.mjs';
/**
 * Fill the brand-template parts of design_spec.md deterministically.
 *
 * A brand deck should not ask the model to hand-write §II–§VIII and then leave
 * `[fill]` in spec_lock. This script reads template.json + outline.json and
 * fills the brand contract rows; §IX stays exactly as projected.
 *
 *   node scripts/fill-brand-contract.mjs <project>
 *   node scripts/fill-brand-contract.mjs <project> --check
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const args = { _: [] };
for (let i = 2; i < process.argv.length; i += 1) {
  const item = process.argv[i];
  if (!item.startsWith('--')) { args._.push(item); continue; }
  const key = item.slice(2);
  const next = process.argv[i + 1];
  if (next && !next.startsWith('--')) { args[key] = next; i += 1; }
  else args[key] = true;
}

const project = path.resolve(expandUserPath(args._[0] || ''));
const specPath = path.join(project, 'design_spec.md');
const outlinePath = path.join(project, 'outline.json');
if (!fs.existsSync(specPath)) { console.error(`[BLOCK] 没有 design_spec.md：${specPath}`); process.exit(1); }
if (!fs.existsSync(outlinePath)) { console.error(`[BLOCK] 没有 outline.json：${outlinePath}`); process.exit(1); }

function readBrand() {
  const candidates = [
    path.join(project, 'template.json'),
    path.join(ROOT, 'templates', 'brand', 'zhongtai-v5', 'template.json'),
  ];
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      try {
        const data = readJsonFile(file);
        if (data && (data.type === 'brand' || data.type === 'layout' || data.id === 'zhongtai-v5' || data.id === 'presentation_core')) return data;
      } catch { /* ignore */ }
    }
  }
  return null;
}

const brand = readBrand();
if (!brand) {
  console.error('[BLOCK] 没有找到品牌模板 template.json；这个脚本只用于品牌母版稿。');
  process.exit(1);
}

const outline = readJsonFile(outlinePath);
const contract = outline.contract || {};
let spec = fs.readFileSync(specPath, 'utf8');

const safe = brand.structure?.safeArea || { x: 67, y: 96, w: 1145, h: 480 };
const titleBar = brand.structure?.titleBar || { x: 204, baseline: 54, size: 32 };
const colors = brand.constants?.colors || {};
const fonts = brand.constants?.fonts || {};
const type = brand.structure?.typeScale || {};
const pages = brand.structure?.pages || [];

function replaceLine(text, prefix, replacement) {
  const lines = text.split('\n');
  const index = lines.findIndex((line) => line.trim().startsWith(prefix));
  if (index >= 0) lines[index] = replacement;
  return lines.join('\n');
}

function replaceInSection(text, heading, prefix, replacement) {
  const start = text.indexOf(heading);
  if (start < 0) return text;
  const next = text.indexOf('\n## ', start + 1);
  const end = next < 0 ? text.length : next;
  const part = text.slice(start, end);
  const lines = part.split('\n');
  const index = lines.findIndex((line) => line.trim().startsWith(prefix));
  if (index < 0) return text;
  lines[index] = replacement;
  return text.slice(0, start) + lines.join('\n') + text.slice(end);
}

function appendToSection(text, heading, lines) {
  const start = text.indexOf(heading);
  if (start < 0) return text;
  const next = text.indexOf('\n## ', start + 1);
  const end = next < 0 ? text.length : next;
  const part = text.slice(start, end);
  const missing = lines.filter((line) => !part.includes(line.split(':')[0] + ':'));
  if (!missing.length) return text;
  const body = part.replace(/\n*$/, '\n');
  return text.slice(0, start) + body + missing.join('\n') + '\n' + text.slice(end);
}

function tableRowsAfterHeading(text, heading, rows) {
  const start = text.indexOf(heading);
  if (start < 0) return text;
  const rest = text.slice(start);
  const sep = rest.match(/^\|(?:[^\n]*\|)?\s*-{3,}[^\n]*\n/m);
  if (!sep || sep.index === undefined) return text;
  const insertAt = start + sep.index + sep[0].length;
  return `${text.slice(0, insertAt)}${rows.join('\n')}\n${text.slice(insertAt)}`;
}

// §I — project metadata that the scaffold leaves as [fill]
spec = replaceLine(spec, '| Page Count |', `| Page Count | ${outline.slides.length} |`);
spec = replaceLine(spec, '| Target Audience |', `| Target Audience | ${contract.audience || '—'} |`);
spec = replaceLine(spec, '| Communication Intent |', `| Communication Intent | ${contract.communicationIntent || '—'} |`);
spec = replaceLine(spec, '| Desired Audience Outcome |', `| Desired Audience Outcome | ${contract.audienceOutcome || '—'} |`);
spec = replaceLine(spec, '| Core Message / Ask / Action |', `| Core Message / Ask / Action | ${contract.coreMessage || '—'} |`);
spec = replaceLine(spec, '| Delivery Context |', `| Delivery Context | ${contract.deliveryContext || '—'} |`);
spec = replaceLine(spec, '| Artifact Afterlife |', `| Artifact Afterlife | ${contract.artifactAfterlife || '—'} |`);
spec = replaceLine(spec, '| Reading Mode |', `| Reading Mode | ${contract.readingMode || 'balanced'} |`);
spec = replaceLine(spec, '| Content Strategy |',
  `| Content Strategy | ${contract.workMode || 'create'}；mode ${contract.mode || 'briefing'}；readingMode ${contract.readingMode || 'balanced'}；pageBudget ${contract.pageBudget || 'standard'} |`);
spec = replaceLine(spec, '| Design Style |', `| Design Style | ${brand.displayName || brand.id}（${brand.id}） |`);
spec = replaceLine(spec, '| AI Image Acquisition Path |', '| AI Image Acquisition Path | not applicable |');
spec = replaceLine(spec, '| Generation Mode |', '| Generation Mode | continuous |');
spec = replaceLine(spec, '| Spec Refinement |', '| Spec Refinement | off |');
spec = replaceLine(spec, '| Speaker Notes |', '| Speaker Notes | enabled（品牌母版交付默认） |');
spec = replaceLine(spec, '| Custom Animations |', '| Custom Animations | disabled（默认） |');
spec = replaceLine(spec, '| Narration Audio |', '| Narration Audio | disabled（默认） |');

// §II — canvas
spec = replaceLine(spec, '| Margins |',
  `| Margins | 安全区 x ${safe.x}–${safe.x + safe.w}，y ${safe.y}–${safe.y + safe.h}；底部禁区 y > 576 |`);
spec = replaceLine(spec, '| Content Area |',
  `| Content Area | x ${safe.x}–${safe.x + safe.w}，y ${safe.y}–${safe.y + safe.h}；标题条 x=${titleBar.x} |`);

// §III — visual theme
spec = replaceLine(spec, '- **Mode**:', `- **Mode**: ${contract.mode || 'briefing'}`);
spec = replaceLine(spec, '- **Visual style**:', '- **Visual style**: 中泰品牌红白标准版式');
spec = replaceLine(spec, '- **Theme**:', `- **Theme**: ${brand.displayName || brand.id}（${brand.id}）`);
spec = replaceLine(spec, '- **Tone**:', '- **Tone**: 克制、正式、决策导向');
spec = replaceLine(spec, '| Background |', `| Background | ${colors.paper || '#FFFFFF'} | 页面底色与卡片底 |`);
spec = replaceLine(spec, '| Primary |', `| Primary | ${colors.brand || '#B20017'} | 标题条、品牌结构条、表头 |`);
spec = replaceLine(spec, '| Accent |', `| Accent | ${colors.accent || '#C00000'} | 注释、强调 |`);
spec = replaceLine(spec, '| Body text |', `| Body text | ${colors.ink || '#000000'} | 正文与标题 |`);

// §IV — typography
spec = replaceLine(spec, '| Title | [fill]', `| Title | 微软雅黑 | ${fonts.family || 'Microsoft YaHei'} | — | PingFang SC, Noto Sans SC, sans-serif |`);
spec = replaceLine(spec, '| Body | [fill] | [fill]', `| Body | 微软雅黑 | ${fonts.family || 'Microsoft YaHei'} | — | PingFang SC, Noto Sans SC, sans-serif |`);
spec = replaceLine(spec, '- **Typography upgrade (Reference)**:', '- **Typography upgrade (Reference)**: none');
spec = replaceLine(spec, '- **Title stack**:', `- **Title stack**: ${fonts.stack || "'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', sans-serif"}`);
spec = replaceLine(spec, '- **Body stack**:', `- **Body stack**: ${fonts.stack || "'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', sans-serif"}`);
spec = replaceLine(spec, '| Body | [fill]', `| Body | ${type.body || 19} |`);
spec = replaceLine(spec, '| Page title |', `| Page title | ${type.title || 32} |`);
spec = replaceLine(spec, '| Subtitle |', `| Subtitle | ${type.subhead || 21} |`);
spec = replaceLine(spec, '| Annotation |', `| Annotation | ${type.annotation || 14} |`);
spec = replaceLine(spec, '| Footnote |', `| Footnote | ${type.annotation || 14} |`);

// §V — layout principles
spec = replaceLine(spec, '- **Hierarchy direction**:', `- **Hierarchy direction**: 结论先行；标题条固定 x=${titleBar.x}，正文落在安全区`);
spec = replaceLine(spec, '- **Composition tendency**:', '- **Composition tendency**: 三栏卡片 / 表格 / 指标条 / 分层结构交替，避免连续同构');
spec = replaceLine(spec, '- **Cross-page continuity**:', '- **Cross-page continuity**: 同一品牌红、同一四档字号、同一页脚位置');
spec = replaceLine(spec, '- **Spacing anchors**:', `- **Spacing anchors**: 内容区 x ${safe.x}–${safe.x + safe.w}，y ${safe.y}–${safe.y + safe.h}；底部 y>576 只放页脚`);
spec = replaceLine(spec, '- **Spacing posture**:', `- **Spacing posture**: 内容区 x ${safe.x}–${safe.x + safe.w}，y ${safe.y}–${safe.y + safe.h}；底部 y>576 只放页脚`);

// §VI — icons
spec = replaceLine(spec, '| [fill] | [fill] |', '| Tabler / Phosphor | 状态、能力、流程图标；不引入包外图标 |');

// §VII — ensure it exists
if (!/^## VII\. /m.test(spec)) {
  spec = spec.replace(/^## VIII\. /m,
    '## VII. Visualization Reference List\n\n| Page | Family | Template | Usage |\n| --- | --- | --- | --- |\n| — | none | — | 本期不引用额外可视化模板 |\n\n## VIII. ');
}

// §VIII — brand background images.
// Declare only the backgrounds this outline actually places. An unused row is a
// quality-gate error ("usable terminal content but not referenced"), and any
// error makes pptx-export downgrade the whole deck to flat, which drops the
// master and every layout.
const IMAGE_ROWS = {
  'bg-cover.jpg': '| bg-cover.jpg | 1280×720 | 16:9 | 封面品牌底图 | background | full-bleed | adaptive | user | existing | assets/bg-cover.jpg | none | cover |',
  'bg-title.jpg': '| bg-title.jpg | 1280×720 | 16:9 | 项目名页底图 | background | full-bleed | adaptive | user | existing | assets/bg-title.jpg | none | title |',
  'bg-content.jpg': '| bg-content.jpg | 1280×720 | 16:9 | 内容页底图 | background | full-bleed | adaptive | user | existing | assets/bg-content.jpg | none | content |',
  'bg-ending.jpg': '| bg-ending.jpg | 1280×720 | 16:9 | 结尾页底图 | background | full-bleed | adaptive | user | existing | assets/bg-ending.jpg | none | ending |',
};

const slides = Array.isArray(outline.slides) ? outline.slides : [];
const isTitlePage = (slide) => {
  if (String(slide.template || '').toLowerCase() === 'title') return true;
  return slide.role === 'section' && /title|项目名|project/i.test(String(slide.id || ''));
};
const usedImages = new Set();
for (const slide of slides) {
  if (slide.role === 'cover') usedImages.add('bg-cover.jpg');
  else if (slide.role === 'ending') usedImages.add('bg-ending.jpg');
  else if (isTitlePage(slide)) usedImages.add('bg-title.jpg');
  else usedImages.add('bg-content.jpg');
}
if (!usedImages.size) usedImages.add('bg-cover.jpg');

const imageRows = Object.keys(IMAGE_ROWS).filter((name) => usedImages.has(name)).map((name) => IMAGE_ROWS[name]);

// The brand design_spec template ships all four rows; prune the unused ones.
for (const name of Object.keys(IMAGE_ROWS)) {
  if (usedImages.has(name)) continue;
  spec = spec.replace(new RegExp(`^\\|\\s*${name.replace('.', '\\.')}\\s*\\|[^\\n]*\\n`, 'gm'), '');
}
if (brand.type !== 'layout') {
  // Add each missing row on its own: a deck can keep one background and gain
  // another later, so an all-or-nothing check would never re-add bg-title.
  for (const name of Object.keys(IMAGE_ROWS)) {
    if (!usedImages.has(name)) continue;
    const hasRow = new RegExp(`^\\|\\s*${name.replace('.', '\\.')}\\s*\\|`, 'm').test(spec);
    if (!hasRow) spec = tableRowsAfterHeading(spec, '## VIII. Image Resource List', [IMAGE_ROWS[name]]);
  }
}

// §X — speaker notes
spec = replaceInSection(spec, '## X. ', '- **Generation**:', '- **Generation**: enabled');
spec = replaceInSection(spec, '## X. ', '- **Content**:', '- **Content**: 每页 1–3 句讲解提示，围绕页面结论与证据，不新增事实');

// Also fill the execution lock's brand sections; gen-spec-lock only rewrites
// the structural pptx_* sections and would otherwise preserve [fill].
const lockPath = path.join(project, 'spec_lock.md');
if (fs.existsSync(lockPath)) {
  let lock = fs.readFileSync(lockPath, 'utf8');
  lock = replaceLine(lock, '- mode:', `- mode: ${contract.mode || 'briefing'}`);
  lock = replaceLine(lock, '- visual_style:', '- visual_style: brand-red-standard');
  lock = replaceLine(lock, '- bg:', `- bg: ${colors.paper || '#FFFFFF'}`);
  lock = replaceLine(lock, '- primary:', `- primary: ${colors.brand || '#B20017'}`);
  lock = replaceLine(lock, '- accent:', `- accent: ${colors.accent || '#C00000'}`);
  lock = replaceLine(lock, '- text:', `- text: ${colors.ink || '#000000'}`);
  lock = replaceLine(lock, '- font_family:', `- font_family: ${fonts.family || 'Microsoft YaHei'}`);
  lock = replaceLine(lock, '- title_family:', `- title_family: ${fonts.family || 'Microsoft YaHei'}`);
  lock = replaceLine(lock, '- body_family:', `- body_family: ${fonts.family || 'Microsoft YaHei'}`);
  const isLayout = brand.type === 'layout';
  const bodySize = isLayout ? 22 : (type.body || 19);
  const displaySize = isLayout ? 54 : 60;
  const metricSize = isLayout ? 28 : 36;
  const subtitleSize = isLayout ? 24 : (type.subhead || 21);
  lock = replaceLine(lock, '- body:', `- body: ${bodySize}`);
  lock = replaceLine(lock, '- title:', `- title: ${type.title || 32}`);
  lock = replaceLine(lock, '- library:', '- library: tabler-outline, phosphor');
  lock = replaceLine(lock, '- inventory:', '- inventory: status, capability, process');
  lock = appendToSection(lock, '## colors', ['- muted: #595959', '- line: #D9D9D9', '- paper: #FFFFFF']);
  lock = replaceLine(lock, '- subtitle:', `- subtitle: ${subtitleSize}`);
  lock = replaceLine(lock, '- annotation:', `- annotation: ${type.annotation || 14}`);
  lock = replaceLine(lock, '- display:', `- display: ${displaySize}`);
  lock = replaceLine(lock, '- metric:', `- metric: ${metricSize}`);
  lock = appendToSection(lock, '## typography', [
    `- subtitle: ${subtitleSize}`,
    `- annotation: ${type.annotation || 14}`,
    `- display: ${displaySize}`,
    `- metric: ${metricSize}`,
  ]);
  if (brand.type !== 'layout') {
  const imageLines = Object.keys(IMAGE_ROWS)
    .filter((name) => usedImages.has(name))
    .map((name) => `- ${name}: images/${name} | source=user | crop=adaptive`);
  for (const name of Object.keys(IMAGE_ROWS)) {
    if (usedImages.has(name)) continue;
    lock = lock.replace(new RegExp(`^-\\s*${name.replace('.', '\\.')}\\s*:[^\\n]*\\n?`, 'gm'), '');
  }
  if (!/^## images\b/m.test(lock)) {
    const blockText = '## images\n' + imageLines.join('\n') + '\n';
    const rhythm = lock.indexOf('## page_rhythm');
    lock = rhythm > 0 ? `${lock.slice(0, rhythm)}${blockText}\n${lock.slice(rhythm)}` : `${lock}\n${blockText}`;
  } else {
    lock = appendToSection(lock, '## images', imageLines);
  }
  }
  if (!args.check) fs.writeFileSync(lockPath, lock, 'utf8');
}

const remaining = [...spec.matchAll(/\[fill[^\]]*\]/g)].map((m) => m[0]);
if (args.check) {
  if (remaining.length) {
    console.error(`[BLOCK] design_spec.md 仍有 ${remaining.length} 个占位符：`);
    for (const item of [...new Set(remaining)]) console.error(`  - ${item}`);
    process.exit(1);
  }
  console.log('[OK] design_spec.md 品牌契约已完整');
  process.exit(0);
}

fs.writeFileSync(specPath, spec, 'utf8');
if (remaining.length) {
  console.error(`[warn] 仍有 ${remaining.length} 个未映射占位符：${[...new Set(remaining)].join(', ')}`);
  console.error('[warn] 已写入其余品牌字段；请检查上述占位符');
} else {
  console.log(`[OK] design_spec.md 品牌契约已填充（${brand.id}，${pages.length} 个页面类型）`);
}
