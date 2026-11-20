#!/usr/bin/env node
import { expandUserPath } from './lib/paths.mjs';
import { readJsonFile } from './lib/json.mjs';
/**
 * Apply a theme to an existing engine design contract.
 *
 * Usage:
 *   node scripts/apply-theme.mjs <project> --theme <id> [--scope <scope>]
 *
 * Scopes are split into two axes (scripts/lib/theme-scopes.mjs):
 *
 *   colors / typography / components / decoration / visual
 *       Visual axis. Changes how a page looks: palette, type, component
 *       drawing, decoration. Never touches spacing, composition or §IX.
 *       `visual` is the recommended scope when a user picks a theme.
 *
 *   layout
 *       Layout axis, opt-in only. Writes §V spacing anchors, composition
 *       tendency and cross-page continuity. Use it only when the user asks
 *       for the theme's layout character as well.
 *
 *   full / design
 *       Legacy mixed scopes, kept for compatibility and deprecated. They warn
 *       because they cross both axes.
 *
 * The theme is an overlay, never the source of the deck's story.
 * §I, §II, §VI–§X, page count and page order are always untouched.
 */

import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCOPES,
  AXIS,
  DEPRECATED_SCOPES,
  isLayoutScope,
  layoutFieldsFor,
  writes,
} from './lib/theme-scopes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item.startsWith('--')) {
      const key = item.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i += 1;
      } else {
        args[key] = true;
      }
    } else {
      args._.push(item);
    }
  }
  return args;
}

function fail(message) {
  console.error(`[BLOCK] ${message}`);
  process.exit(1);
}

/** Replace the body between a heading and the next heading of the same-or-higher level. */
function replaceSection(text, heading, body) {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line.trim() === heading.trim());
  if (start === -1) return null;
  const level = (heading.match(/^#+/) || ['##'])[0].length;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    const match = lines[i].match(/^(#+)\s/);
    if (match && match[1].length <= level) {
      end = i;
      break;
    }
  }
  // Slice from the next heading so the original trailing blanks are dropped;
  // exactly one blank line is inserted before the body and before the heading.
  return [...lines.slice(0, start + 1), '', body.trim(), '', ...lines.slice(end)].join('\n');
}

function replaceBlock(text, heading, body) {
  const replaced = replaceSection(text, heading, body);
  return replaced === null ? null : replaced;
}

function hasHeading(text, heading) {
  return text.split('\n').some((line) => line.trim() === heading.trim());
}

function sha(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * The three §V lines that belong to the layout axis. Hashing just these lets a
 * visual scope append its Decoration System to §V while proving it did not
 * touch spacing or composition.
 */
const LAYOUT_LINE_KEYS = ['Spacing anchors', 'Composition tendency', 'Cross-page continuity'];

function layoutLines(text) {
  return text
    .split('\n')
    .filter((line) => LAYOUT_LINE_KEYS.some((key) => line.includes(`**${key}**`)))
    .join('\n');
}

function colorTable(colors) {
  const rows = [
    ['Background', colors.background, '主背景'],
    ['Secondary background', colors.surface || colors.secondary_background, '卡片、面板、分区底色'],
    ['Primary', colors.primary, '主文字、标题、主结构色'],
    ['Accent', colors.accent, '强调色、关键结论'],
    ['Secondary accent', colors.accent2 || colors.secondary_accent, '次强调、灰阶层次'],
    ['Body text', colors.text || colors.body_text, '正文'],
    ['Secondary text', colors.textMuted || colors.secondary_text, '注释、图注、来源'],
    ['Divider', colors.rule || colors.divider, '分隔线、hairline'],
  ].filter((row) => row[1]);
  return [
    '| Role | HEX | Purpose |',
    '| --- | --- | --- |',
    ...rows.map(([role, hex, purpose]) => `| ${role} | ${hex} | ${purpose} |`),
  ].join('\n');
}

function typographyBody(token) {
  const ty = token.typography || {};
  const titleStack = ty.title_stack_ppt || ty.title_stack || 'sans-serif';
  const bodyStack = ty.body_stack_ppt || ty.body_stack || 'sans-serif';
  const titlePrimary = String(titleStack).split(',')[0].trim().replace(/^["']|["']$/g, '');
  const bodyPrimary = String(bodyStack).split(',')[0].trim().replace(/^["']|["']$/g, '');
  const sizes = [
    ['Display', ty.display],
    ['Title', ty.title],
    ['Metric', ty.metric],
    ['Subtitle', ty.subtitle],
    ['Body', ty.body],
    ['Annotation', ty.annotation],
  ].filter(([, size]) => size);

  return `### Font Plan

| Role | Character (Reference) | Primary | English if non-English | Fallback tail |
| --- | --- | --- | --- | --- |
| Title | ${titlePrimary} | ${titlePrimary} | ${titlePrimary} | sans-serif |
| Body | ${bodyPrimary} | ${bodyPrimary} | ${bodyPrimary} | sans-serif |

- **Title stack**: ${titleStack}
- **Body stack**: ${bodyStack}

### Font Size Hierarchy

| Purpose | Anchor Size (px) |
| --- | ---: |
${sizes.map(([name, size]) => `| ${name} | ${size} |`).join('\n')}`;
}

function lockColors(colors) {
  const rows = [
    ['background', colors.background],
    ['secondary_background', colors.surface || colors.secondary_background],
    ['primary', colors.primary],
    ['accent', colors.accent],
    ['secondary_accent', colors.accent2 || colors.secondary_accent],
    ['body_text', colors.text || colors.body_text],
    ['secondary_text', colors.textMuted || colors.secondary_text],
    ['divider', colors.rule || colors.divider],
  ].filter(([, value]) => value);
  return rows.map(([key, value]) => `- ${key}: ${value}`).join('\n');
}

function lockTypography(token) {
  const ty = token.typography || {};
  const titleFamily = ty.title_stack_ppt || ty.title_stack || 'Arial';
  const bodyFamily = ty.body_stack_ppt || ty.body_stack || 'Arial';
  const rows = [
    ['title_family', titleFamily],
    ['body_family', bodyFamily],
    ['font_family', bodyFamily],
    ['body', ty.body],
    ['title', ty.title],
    ['subtitle', ty.subtitle],
    ['annotation', ty.annotation],
    ['display', ty.display],
    ['metric', ty.metric],
  ].filter(([, value]) => value !== undefined && value !== null && value !== '');
  return rows.map(([key, value]) => `- ${key}: ${value}`).join('\n');
}

function spacingLine(token) {
  const sp = token.spacing || {};
  const parts = [];
  if (sp.margin) parts.push(`page margin ${sp.margin}`);
  if (sp.gap) parts.push(`block gap ${sp.gap}`);
  if (sp.gutter) parts.push(`column gutter ${sp.gutter}`);
  if (sp.radius !== undefined) parts.push(`corner radius ${sp.radius}`);
  if (sp.leading) parts.push(`body leading ${sp.leading}`);
  return parts.length ? `- **Spacing anchors**: ${parts.join(' · ')}` : null;
}

function appendSubsection(text, parentHeading, heading, body) {
  if (hasHeading(text, heading)) return replaceSection(text, heading, body);
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line.trim() === parentHeading.trim());
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^##\s/.test(lines[i])) {
      end = i;
      break;
    }
  }
  const tail = lines.slice(end);
  const head = lines.slice(0, end);
  while (head.length && head[head.length - 1].trim() === '') head.pop();
  return [...head, '', `### ${heading.replace(/^###\s*/, '')}`, '', body.trim(), '', ...tail].join('\n');
}

/** Resolve a palette role name (or literal hex) against the theme colors. */
function resolveColor(colors, value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'string' && value.startsWith('#')) return value;
  return colors[value] || fallback || value;
}

function componentsTable(token) {
  const comp = token.components;
  const colors = token.colors || {};
  if (!comp) return null;
  const role = (name) => (name ? `${name}（${resolveColor(colors, name, '')}）` : '无');
  const rows = [
    ['KPI 卡', `填充 ${role(comp.kpi.fill)}，描边 ${comp.kpi.border}px，投影 ${comp.kpi.shadow}，圆角 ${comp.kpi.radius}，数字 ×${comp.kpi.numberScale}`],
    ['表格', `表头 ${role(comp.table.headerFill)} + 文字 ${role(comp.table.headerText)}；边框 ${comp.table.border}px；行线 ${comp.table.rowRule}px ${role(comp.table.rowRuleColor)}；斑马纹 ${role(comp.table.zebra)}；内边距 ${comp.table.cellPadX}·${comp.table.cellPadY}；圆角 ${comp.table.radius}`],
    ['条形图', `条高 ${comp.chart.barHeight}px，描边 ${comp.chart.barStroke}px，填充 ${(comp.chart.barFill || []).join(' / ')}，轴线 ${comp.chart.axisRule}px，网格 ${comp.chart.gridlines} 条，数值 ${comp.chart.valueSize}px / ${comp.chart.valueWeight}`],
    ['折线图', `线宽 ${comp.line.stroke}px，点径 ${comp.line.dot}px，面积填充 ${comp.line.area ? '开' : '关'}`],
    ['引用块', `填充 ${role(comp.callout.fill)}，文字 ${role(comp.callout.text)}，描边 ${comp.callout.border}px，侧条 ${comp.callout.barWidth}px ${role(comp.callout.barColor)}，投影 ${comp.callout.shadow}，圆角 ${comp.callout.radius}`],
    ['要点列表', `标记 ${comp.list.marker}，${comp.list.markerSize}px，填充 ${role(comp.list.markerFill)}`],
  ];
  return [
    '| 组件 | 规则 |',
    '| --- | --- |',
    ...rows.map(([k, v]) => `| ${k} | ${v} |`),
  ].join('\n');
}

function componentsBody(token) {
  const table = componentsTable(token);
  if (!table) return null;
  return `${table}

- **组件也是硬约束**：图表、表格、KPI、引用块、列表按上表画，不回到"通用卡片 + 1px 灰线"的默认样式。
- **每页至少一个组件**：内容页必须有图表、表格、KPI、引用块或列表之一，按本主题的组件规则落到页面上。
- **组件先于装饰**：先把数据关系和组件画对，再加页眉标签、标题线和投影。
- **颜色只取 §III**：组件里的填充、描边、文字全部来自 palette 角色。`;
}

function lockComponents(token) {
  const comp = token.components;
  if (!comp) return null;
  const rows = [
    ['kpi', `fill=${comp.kpi.fill || 'none'} border=${comp.kpi.border} shadow=${comp.kpi.shadow} radius=${comp.kpi.radius} numberScale=${comp.kpi.numberScale}`],
    ['table', `header=${comp.table.headerFill || 'none'}/${comp.table.headerText} border=${comp.table.border} rowRule=${comp.table.rowRule} zebra=${comp.table.zebra || 'none'} pad=${comp.table.cellPadX}x${comp.table.cellPadY} radius=${comp.table.radius}`],
    ['chart_bar', `height=${comp.chart.barHeight} stroke=${comp.chart.barStroke} fills=${(comp.chart.barFill || []).join(',')} axis=${comp.chart.axisRule} grid=${comp.chart.gridlines} value=${comp.chart.valueSize}/${comp.chart.valueWeight}`],
    ['chart_line', `stroke=${comp.line.stroke} dot=${comp.line.dot} area=${comp.line.area ? 'on' : 'off'}`],
    ['callout', `fill=${comp.callout.fill || 'none'} text=${comp.callout.text} border=${comp.callout.border} bar=${comp.callout.barWidth} shadow=${comp.callout.shadow} radius=${comp.callout.radius}`],
    ['list', `marker=${comp.list.marker} size=${comp.list.markerSize} fill=${comp.list.markerFill}`],
  ];
  return rows.map(([key, value]) => `- ${key}: ${value}`).join('\n');
}

function decorationTable(token) {
  const dec = token.decoration;
  const colors = token.colors || {};
  if (!dec) return null;
  const text = resolveColor(colors, dec.stroke.color, '#000000');
  const ruleColor = resolveColor(colors, dec.rule.color, text);
  const rows = [
    ['描边', dec.stroke.width
      ? `${dec.stroke.width}px ${text}（重描边 ${dec.stroke.heavy}px，hairline ${dec.stroke.hairline}px）`
      : `无描边（hairline ${dec.stroke.hairline}px ${resolveColor(colors, dec.stroke.color, text)}）`],
    ['硬投影', dec.shadow.dx || dec.shadow.dy
      ? `${dec.shadow.dx}px / ${dec.shadow.dy}px ${resolveColor(colors, dec.shadow.color, text)}，透明度 ${dec.shadow.opacity}`
      : '无'],
    ['标签', dec.tag
      ? `${dec.tag.fill} 填充（${resolveColor(colors, dec.tag.fill, text)}）+ ${dec.tag.stroke}px 描边，${dec.tag.fontSize}px / ${dec.tag.weight}，高 ${dec.tag.height}px`
      : '无，用普通 kicker 文字'],
    ['分隔线', dec.rule.thickness ? `${dec.rule.thickness}px ${ruleColor}` : '无'],
    ['标记块', `${dec.marker.size}×${dec.marker.size}，${dec.marker.stroke}px 描边，${dec.marker.fill} 填充`],
    ['图表条', `高 ${dec.chart.barHeight}px，${dec.chart.barStroke}px 描边，填充在 ${(dec.chart.fills || []).join(' / ')} 之间交替`],
    ['圆角', `${dec.radius}px`],
    ['页面家具', (dec.furniture || []).join(' · ')],
  ];
  return [
    '| 项 | 规则 |',
    '| --- | --- |',
    ...rows.map(([k, v]) => `| ${k} | ${v} |`),
  ].join('\n');
}

function decorationBody(token) {
  const table = decorationTable(token);
  if (!table) return null;
  const taboos = Array.isArray(token.taboos) && token.taboos.length
    ? `\n\n- **主题禁忌**：${token.taboos.join('；')}`
    : '';
  return `${table}

- **主题装饰是硬约束**：颜色只取 §III，描边、投影、标签、分隔线、图表条按上表，不临时发明。
- **页面家具每页复用**：内容可变，家具不换；缺少家具的页面视为未完成。
- **装饰不替代关系**：图表、对比、层级优先于装饰块。${taboos}`;
}

function lockDecoration(token) {
  const dec = token.decoration;
  const colors = token.colors || {};
  if (!dec) return null;
  const text = resolveColor(colors, dec.stroke.color, '#000000');
  const rows = [
    ['stroke_width', dec.stroke.width],
    ['stroke_heavy', dec.stroke.heavy],
    ['stroke_hairline', dec.stroke.hairline],
    ['stroke_color', text],
    ['shadow', dec.shadow.dx || dec.shadow.dy ? `${dec.shadow.dx} ${dec.shadow.dy} ${resolveColor(colors, dec.shadow.color, text)}` : 'none'],
    ['tag', dec.tag ? `${dec.tag.fill} ${resolveColor(colors, dec.tag.fill, text)} / ${dec.tag.stroke}px / ${dec.tag.fontSize}px / weight ${dec.tag.weight} / height ${dec.tag.height}` : 'none'],
    ['rule', dec.rule.thickness ? `${dec.rule.thickness}px ${resolveColor(colors, dec.rule.color, text)}` : 'none'],
    ['marker', `${dec.marker.size} @ ${dec.marker.stroke}px ${dec.marker.fill}`],
    ['chart_bar', `${dec.chart.barHeight} @ ${dec.chart.barStroke}px ${(dec.chart.fills || []).join(',')}`],
    ['radius', dec.radius],
    ['furniture', (dec.furniture || []).join(', ')],
  ];
  return rows.map(([key, value]) => `- ${key}: ${value}`).join('\n');
}

const args = parseArgs(process.argv.slice(2));
const project = path.resolve(expandUserPath(args._[0] || ''));
const themeId = typeof args.theme === 'string' ? args.theme : '';
const scope = typeof args.scope === 'string' ? args.scope : 'colors';

if (!project || !themeId) {
  fail(`Usage: apply-theme.mjs <project> --theme <theme-id> [--scope ${SCOPES.join('|')}]`);
}
if (!SCOPES.includes(scope)) {
  fail(`Unknown scope: ${scope} (use ${SCOPES.join(' / ')})`);
}
if (DEPRECATED_SCOPES[scope]) {
  console.warn(`[WARN] ${scope} is deprecated. ${DEPRECATED_SCOPES[scope]}`);
}

const tokenPath = path.join(ROOT, 'themes', 'tokens', `${themeId}.json`);
if (!fs.existsSync(tokenPath)) fail(`Unknown theme: ${themeId}`);
const token = readJsonFile(tokenPath);

const specPath = path.join(project, 'design_spec.md');
const lockPath = path.join(project, 'spec_lock.md');
if (!fs.existsSync(specPath) || !fs.existsSync(lockPath)) {
  fail('design_spec.md / spec_lock.md not found. Write the design contract first.');
}

let spec = fs.readFileSync(specPath, 'utf8');
let lock = fs.readFileSync(lockPath, 'utf8');

if (!hasHeading(spec, '## IX. Content Outline')) {
  fail('design_spec.md has no §IX. Write the per-page story before applying any theme.');
}
if (!hasHeading(spec, '## III. Visual Theme')) {
  fail('design_spec.md has no §III. Use a engine-format design spec.');
}

const applied = [];
const layoutBefore = sha(layoutLines(spec));

// Colors: always applied.
if (!hasHeading(spec, '### Color Scheme')) {
  fail('design_spec.md §III has no Color Scheme table.');
}
let nextSpec = replaceBlock(spec, '### Color Scheme', colorTable(token.colors || {}));
if (!nextSpec) fail('Failed to replace the Color Scheme table.');
spec = nextSpec;

if (!hasHeading(lock, '## colors')) fail('spec_lock.md has no colors block.');
let nextLock = replaceBlock(lock, '## colors', lockColors(token.colors || {}));
if (!nextLock) fail('Failed to replace the lock colors block.');
lock = nextLock;
applied.push('design_spec §III Color Scheme', 'spec_lock colors');

if (writes(scope, 'typography')) {
  if (!hasHeading(spec, '## IV. Typography System')) {
    fail('design_spec.md has no §IV. Use a engine-format design spec.');
  }
  nextSpec = replaceSection(spec, '## IV. Typography System', typographyBody(token));
  if (!nextSpec) fail('Failed to replace §IV.');
  spec = nextSpec;

  if (!hasHeading(lock, '## typography')) fail('spec_lock.md has no typography block.');
  nextLock = replaceBlock(lock, '## typography', lockTypography(token));
  if (!nextLock) fail('Failed to replace the lock typography block.');
  lock = nextLock;
  applied.push('design_spec §IV', 'spec_lock typography');
}

if (writes(scope, 'spacing')) {
  const line = spacingLine(token);
  if (line) {
    // Test for the line's existence, not for whether the replacement changed
    // anything: re-applying the same theme yields an identical value.
    if (/^- \*\*Spacing anchors\*\*:.*$/m.test(spec)) {
      spec = spec.replace(/^- \*\*Spacing anchors\*\*:.*$/m, line);
    } else {
      const after = [/^(- \*\*Spacing posture\*\*:.*)$/m, /^(- \*\*Cross-page continuity\*\*:.*)$/m];
      const slot = after.find((re) => re.test(spec));
      if (!slot) fail('design_spec.md §V has no place to write Spacing anchors.');
      spec = spec.replace(slot, `$1\n${line}`);
    }
    applied.push('design_spec §V spacing anchors');
  }
}

if (writes(scope, 'components')) {
  if (!token.components) {
    fail(`Theme ${themeId} has no components block. Run: node scripts/build-components.mjs`);
  }
  if (!hasHeading(spec, '## V. Layout Principles')) {
    fail('design_spec.md has no §V. Use a engine-format design spec.');
  }
  const body = componentsBody(token);
  const withComponents = appendSubsection(spec, '## V. Layout Principles', '### Component System', body);
  if (!withComponents) fail('Failed to write §V Component System.');
  spec = withComponents;
  applied.push('design_spec §V Component System');

  const lockBody = lockComponents(token);
  const lockBlock = replaceBlock(lock, '## components', lockBody);
  if (lockBlock) lock = lockBlock;
  else lock = `${lock.replace(/\s+$/, '')}\n\n## components\n\n${lockBody}\n`;
  applied.push('spec_lock components');
}

if (writes(scope, 'decoration')) {
  if (!token.decoration) {
    fail(`Theme ${themeId} has no decoration block. Run: node scripts/build-decorations.mjs`);
  }
  if (!hasHeading(spec, '## V. Layout Principles')) {
    fail('design_spec.md has no §V. Use a engine-format design spec.');
  }

  const body = decorationBody(token);
  const withDecoration = appendSubsection(spec, '## V. Layout Principles', '### Decoration System', body);
  if (!withDecoration) fail('Failed to write §V Decoration System.');
  spec = withDecoration;
  applied.push('design_spec §V Decoration System');

  const lockBody = lockDecoration(token);
  const lockBlock = replaceBlock(lock, '## decoration', lockBody);
  if (lockBlock) {
    lock = lockBlock;
  } else {
    const trimmed = lock.replace(/\s+$/, '');
    lock = `${trimmed}\n\n## decoration\n\n${lockBody}\n`;
  }
  applied.push('spec_lock decoration');
}

if (writes(scope, 'composition')) {
  if (!token.decoration) {
    fail(`Theme ${themeId} has no decoration block. Run: node scripts/build-decorations.mjs`);
  }
  if (!hasHeading(spec, '## V. Layout Principles')) {
    fail('design_spec.md has no §V. Use a engine-format design spec.');
  }

  const dec = token.decoration;
  const colors = token.colors || {};
  const textColor = resolveColor(colors, dec.stroke.color, '#000000');
  const composition = [
    token.behavior || token.bodyCompositionBias || '',
    dec.stroke.width ? `${dec.stroke.width}px ${textColor} 硬边框` : '',
    dec.shadow.dx || dec.shadow.dy ? `${dec.shadow.dx}px 硬投影` : '',
    (dec.furniture || []).length ? `页面家具：${dec.furniture.join(' / ')}` : '',
  ].filter(Boolean).join('；');

  const compositionPattern = /^- \*\*Composition tendency\*\*:.*$/m;
  if (compositionPattern.test(spec)) {
    spec = spec.replace(compositionPattern, `- **Composition tendency**: ${composition}`);
    applied.push('design_spec §V composition tendency');
  } else {
    console.warn('[WARN] design_spec.md §V has no Composition tendency line; skipped.');
  }

  const continuity = (dec.furniture || []).map((name) => ({
    tag: `页眉标签（${dec.tag ? dec.tag.fontSize : 14}px / weight ${dec.tag ? dec.tag.weight : 700}）`,
    rule: `标题分隔线（${dec.rule.thickness}px ${resolveColor(colors, dec.rule.color, textColor)}）`,
    marker: `要点标记块（${dec.marker.size}×${dec.marker.size}）`,
    hardShadow: `硬投影（${dec.shadow.dx}/${dec.shadow.dy}）`,
    softShadow: `柔和投影（${dec.shadow.dx}/${dec.shadow.dy}，透明度 ${dec.shadow.opacity}）`,
    offsetBlock: '错位色块',
  }[name] || name)).join('、');
  const continuityPattern = /^- \*\*Cross-page continuity\*\*:.*$/m;
  if (continuityPattern.test(spec)) {
    spec = spec.replace(continuityPattern, `- **Cross-page continuity**: ${continuity}`);
    applied.push('design_spec §V cross-page continuity');
  } else {
    console.warn('[WARN] design_spec.md §V has no Cross-page continuity line; skipped.');
  }
}

fs.writeFileSync(specPath, spec, 'utf8');
fs.writeFileSync(lockPath, lock, 'utf8');

const selectionPath = path.join(project, 'theme_selection.json');
const source = fs.existsSync(selectionPath)
  ? (readJsonFile(selectionPath).source || 'auto')
  : 'auto';

const overlay = {
  schemaVersion: 2,
  themeId,
  scope,
  axis: AXIS[scope],
  deprecated: Boolean(DEPRECATED_SCOPES[scope]),
  source,
  appliedAt: new Date().toISOString(),
  applied,
  layoutFieldsTouched: layoutFieldsFor(scope, token).filter((label) => applied.includes(label)),
  layout: {
    before: layoutBefore,
    after: sha(layoutLines(spec)),
    changed: layoutBefore !== sha(layoutLines(spec)),
  },
  untouched: isLayoutScope(scope)
    ? ['§I', '§II', '§VI', '§VII', '§VIII', '§IX', '§X', 'page count', 'page order', 'page structure']
    : ['§I', '§II', '§VI', '§VII', '§VIII', '§IX', '§X', 'page count', 'page order', 'page structure', 'spacing', 'composition', 'cross-page continuity'],
  ...(writes(scope, 'decoration') ? { customDecoration: themeId } : {}),
};
fs.writeFileSync(
  path.join(project, 'theme_overlay.json'),
  JSON.stringify(overlay, null, 2) + '\n',
  'utf8',
);

console.log(`[OK] theme ${themeId} applied with scope=${scope} (${AXIS[scope]} axis)`);
for (const item of applied) console.log(`  - ${item}`);
if (!isLayoutScope(scope)) {
  console.log('[OK] §V spacing / composition / continuity untouched');
}
console.log('[OK] theme_overlay.json written');
