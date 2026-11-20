#!/usr/bin/env node
import { readJsonFile } from './lib/json.mjs';
/**
 * Build the component layer for every theme.
 *
 * Usage:
 *   node scripts/build-components.mjs [--check]
 *
 * Reads themes/components.profiles.json (per visualStyle) and
 * themes/components.overrides.json (per theme id), then writes:
 *   themes/tokens/<id>.json                    -> adds `components`
 *   themes/packages/<id>/components.json
 *   themes/packages/<id>/components.fragment.md
 *
 * `--check` verifies the generated component block is already in sync and
 * exits 1 when a token is stale, without writing anything.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const TOKENS = path.join(ROOT, 'themes', 'tokens');
const PACKAGES = path.join(ROOT, 'themes', 'packages');
const PROFILES = path.join(ROOT, 'themes', 'components.profiles.json');
const OVERRIDES = path.join(ROOT, 'themes', 'components.overrides.json');

const checkOnly = process.argv.includes('--check');

const readJson = (file) => readJsonFile(file);

function merge(base, patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return patch;
  const out = { ...(base || {}) };
  for (const [key, value] of Object.entries(patch)) {
    out[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? merge(base && base[key], value)
      : value;
  }
  return out;
}

const profiles = readJson(PROFILES).profiles;
const overrides = readJson(OVERRIDES).overrides || {};

function componentsFor(token) {
  const family = token.visualStyle && profiles[token.visualStyle] ? token.visualStyle : 'editorial';
  const merged = merge(merge({}, profiles[family]), overrides[token.id] || {});
  return { family, components: merged };
}

const role = (colors, name, fallback) => {
  if (!name) return fallback;
  if (typeof name === 'string' && name.startsWith('#')) return name;
  return colors[name] || fallback || name;
};

const esc = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/** Copyable SVG for one component, drawn in this theme's own language. */
function snippets(token, comp) {
  const colors = token.colors || {};
  const ty = token.typography || {};
  const bodyStack = ty.body_stack || 'sans-serif';
  const titleStack = ty.title_stack || bodyStack;
  const text = role(colors, 'text', '#111111');
  const body = ty.body || 20;
  const annotation = ty.annotation || 12;
  const out = [];

  // --- KPI tile ---
  const kpi = comp.kpi;
  const kpiFill = role(colors, kpi.fill, 'none');
  const kpiStroke = kpi.border > 0 ? ` stroke="${role(colors, kpi.borderColor, text)}" stroke-width="${kpi.border}"` : '';
  const kpiShadow = kpi.shadow === 'hard'
    ? `<rect x="80" y="96" width="300" height="132" rx="${kpi.radius}" fill="${role(colors, kpi.borderColor, text)}"/>`
    : '';
  out.push([
    '### KPI 卡',
    '```svg',
    kpiShadow,
    `<rect x="64" y="80" width="300" height="132" rx="${kpi.radius}" fill="${kpiFill === 'none' ? role(colors, 'background', '#fff') : kpiFill}"${kpiStroke}/>`,
    `<text x="88" y="152" font-family="${esc(titleStack)}" font-size="${Math.round((ty.metric || 36) * kpi.numberScale)}" font-weight="${ty.heading_weight || 700}" fill="${role(colors, 'primary', text)}">224</text>`,
    `<text x="88" y="182" font-family="${esc(bodyStack)}" font-size="${annotation + 2}" fill="${role(colors, 'textMuted', text)}">${kpi.labelCase === 'upper' ? 'BRAND MENTIONS' : '品牌提及'}</text>`,
    '```',
    `> 填充 ${kpi.fill || '无'}，描边 ${kpi.border}px，投影 ${kpi.shadow}，圆角 ${kpi.radius}。`,
  ].filter(Boolean).join('\n'));

  // --- table ---
  const table = comp.table;
  const border = table.border > 0 ? role(colors, table.borderColor, text) : null;
  const headerFill = table.headerFill ? role(colors, table.headerFill, text) : null;
  const rowRuleColor = role(colors, table.rowRuleColor, text);
  const zebra = table.zebra ? role(colors, table.zebra, 'none') : null;
  const rows = [
    ['核心指标', 'Q2', 'Q3', '环比'],
    ['有效任务', '1,284', '1,736', '+35%'],
    ['留存率', '41%', '52%', '+11pt'],
    ['人均耗时', '26 min', '18 min', '−31%'],
  ];
  const colX = [96, 380, 560, 740];
  const rowH = 40;
  const tableTop = 80;
  const tableWidth = 900;
  const tableParts = ['```svg'];
  if (headerFill) {
    tableParts.push(`<rect x="80" y="${tableTop}" width="${tableWidth}" height="${rowH}" rx="${table.radius}" fill="${headerFill}"/>`);
  }
  if (zebra) {
    tableParts.push(`<rect x="80" y="${tableTop + rowH * 3}" width="${tableWidth}" height="${rowH}" fill="${zebra}"/>`);
  }
  rows.forEach((cells, rowIndex) => {
    const y = tableTop + rowIndex * rowH;
    const isHeader = rowIndex === 0;
    cells.forEach((cell, i) => {
      tableParts.push(
        `<text x="${colX[i]}" y="${y + Math.round(rowH / 2) + 6}" font-family="${esc(bodyStack)}" font-size="${isHeader ? annotation + 2 : annotation + 3}" font-weight="${isHeader ? 700 : 400}" fill="${isHeader && headerFill ? role(colors, table.headerText, role(colors, 'background', '#fff')) : (i === 0 ? text : role(colors, 'textMuted', text))}">${esc(cell)}</text>`,
      );
    });
    if (table.rowRule > 0) {
      tableParts.push(`<rect x="80" y="${y + rowH}" width="${tableWidth}" height="${table.rowRule}" fill="${isHeader && !headerFill ? role(colors, 'text', text) : rowRuleColor}"/>`);
    }
  });
  if (border) {
    tableParts.push(`<rect x="80" y="${tableTop}" width="${tableWidth}" height="${rowH * rows.length}" rx="${table.radius}" fill="none" stroke="${border}" stroke-width="${table.border}"/>`);
    tableParts.push(`<rect x="82" y="${tableTop + 1}" width="${tableWidth - 4}" height="${rowH * rows.length - 2}" fill="none"/>`);
  }
  tableParts.push('```');
  out.push([
    '### 表格',
    tableParts.join('\n'),
    `> 表头 ${table.headerFill || '不铺底'} + ${table.headerText}；边框 ${table.border}px；行线 ${table.rowRule}px；斑马纹 ${table.zebra || '无'}；单元格内边距 ${table.cellPadX} / ${table.cellPadY}；圆角 ${table.radius}。`,
  ].join('\n'));

  // --- bar chart ---
  const chart = comp.chart;
  const fills = (chart.barFill || ['accent']).map((name, i) => role(colors, name, i ? role(colors, 'surfaceAlt', '#ddd') : role(colors, 'accent', text)));
  const barRows = [['叙事', 92, 440], ['证据', 78, 374], ['数据', 64, 306], ['节奏', 50, 240]];
  const chartParts = ['```svg'];
  const axisColor = role(colors, chart.axisColor, text);
  const gridColor = role(colors, chart.gridColor, role(colors, 'rule', '#ccc'));
  const baseline = 80 + barRows.length * 48;
  if (chart.gridlines > 0) {
    for (let i = 1; i <= chart.gridlines; i += 1) {
      const x = 160 + Math.round((980 * i) / (chart.gridlines + 1));
      chartParts.push(`<rect x="${x}" y="72" width="1" height="${baseline - 72}" fill="${gridColor}" opacity="0.6"/>`);
    }
  }
  barRows.forEach(([label, value, width], i) => {
    const y = 80 + i * 48;
    chartParts.push(`<text x="80" y="${y + Math.round(chart.barHeight / 2) + 5}" font-family="${esc(bodyStack)}" font-size="${chart.labelSize}" fill="${text}">${label}</text>`);
    chartParts.push(`<rect x="160" y="${y}" width="${width}" height="${chart.barHeight}" rx="0" fill="${fills[i % fills.length]}"${chart.barStroke ? ` stroke="${axisColor}" stroke-width="${chart.barStroke}"` : ''}/>`);
    chartParts.push(`<text x="${168 + width}" y="${y + Math.round(chart.barHeight / 2) + 5}" font-family="${esc(bodyStack)}" font-size="${chart.valueSize}" font-weight="${chart.valueWeight}" fill="${text}">${value}</text>`);
  });
  if (chart.axisRule > 0) {
    chartParts.push(`<rect x="160" y="${baseline}" width="980" height="${chart.axisRule}" fill="${axisColor}"/>`);
  }
  chartParts.push('```');
  out.push([
    '### 条形图',
    chartParts.join('\n'),
    `> 条高 ${chart.barHeight}px，描边 ${chart.barStroke}px；坐标轴 ${chart.axisRule}px；网格线 ${chart.gridlines} 条；数值 ${chart.valueSize}px / ${chart.valueWeight}。`,
  ].join('\n'));

  // --- line chart ---
  const line = comp.line;
  const lineColor = role(colors, 'primary', text);
  const points = [[160, 250], [330, 220], [500, 180], [670, 190], [840, 140], [1010, 110]];
  const lineParts = ['```svg'];
  if (line.area) {
    const areaPath = `M${points.map(([x, y]) => `${x} ${y}`).join(' L')} L${points[points.length - 1][0]} 300 L${points[0][0]} 300 Z`;
    lineParts.push(`<path d="${areaPath}" fill="${lineColor}" opacity="${line.areaOpacity}"/>`);
  }
  lineParts.push(`<path d="M${points.map(([x, y]) => `${x} ${y}`).join(' L')}" fill="none" stroke="${lineColor}" stroke-width="${line.stroke}"/>`);
  if (line.dot > 0) {
    for (const [x, y] of points) {
      lineParts.push(`<circle cx="${x}" cy="${y}" r="${line.dot / 2}" fill="${role(colors, line.dotFill, role(colors, 'background', '#fff'))}" stroke="${lineColor}" stroke-width="${line.dotStroke}"/>`);
    }
  }
  lineParts.push('```');
  out.push([
    '### 折线图',
    lineParts.join('\n'),
    `> 线宽 ${line.stroke}px，点径 ${line.dot}px；面积填充 ${line.area ? `开（${line.areaOpacity}）` : '关'}。`,
  ].join('\n'));

  // --- callout ---
  const callout = comp.callout;
  const calloutFill = callout.fill ? role(colors, callout.fill, role(colors, 'surfaceAlt', '#eee')) : null;
  const calloutBar = callout.barWidth > 0 ? role(colors, callout.barColor, role(colors, 'accent', text)) : null;
  const calloutParts = ['```svg'];
  if (callout.shadow === 'hard') {
    calloutParts.push(`<rect x="${86 + 8}" y="${86 + 8}" width="420" height="120" rx="${callout.radius}" fill="${role(colors, callout.borderColor, text)}"/>`);
  }
  calloutParts.push(`<rect x="86" y="86" width="420" height="120" rx="${callout.radius}" fill="${calloutFill || 'none'}"${callout.border > 0 ? ` stroke="${role(colors, callout.borderColor, text)}" stroke-width="${callout.border}"` : ''}/>`);
  if (calloutBar) {
    calloutParts.push(`<rect x="86" y="86" width="${callout.barWidth}" height="120" fill="${calloutBar}"/>`);
  }
  calloutParts.push(`<text x="${86 + (calloutBar ? callout.barWidth + 20 : 20)}" y="140" font-family="${esc(titleStack)}" font-size="${body - 4}" font-weight="${ty.heading_weight || 700}" fill="${calloutFill ? role(colors, callout.text, text) : text}">判断先行，证据在后</text>`);
  calloutParts.push(`<text x="${86 + (calloutBar ? callout.barWidth + 20 : 20)}" y="170" font-family="${esc(bodyStack)}" font-size="${annotation + 2}" fill="${calloutFill ? role(colors, callout.text, text) : role(colors, 'textMuted', text)}">一页只留一个主导对象，装饰不替代表达。</text>`);
  calloutParts.push('```');
  out.push([
    '### 引用块 / 结论条',
    calloutParts.join('\n'),
    `> 填充 ${callout.fill || '无'}，描边 ${callout.border}px，侧条 ${callout.barWidth}px，投影 ${callout.shadow}，圆角 ${callout.radius}。`,
  ].join('\n'));

  // --- list ---
  const list = comp.list;
  const markerFill = role(colors, list.markerFill, role(colors, 'accent', text));
  const markerStroke = list.markerStroke > 0 ? ` stroke="${role(colors, list.borderColor || 'text', text)}" stroke-width="${list.markerStroke}"` : '';
  const listParts = ['```svg'];
  ['判断先行，证据在后', '一页只留一个主导对象', '装饰不替代关系表达'].forEach((line, i) => {
    const y = 96 + i * 44;
    if (list.marker === 'circle') {
      listParts.push(`<circle cx="85" cy="${y - 6}" r="${list.markerSize / 2}" fill="${markerFill}"${markerStroke}/>`);
    } else if (list.marker === 'square') {
      listParts.push(`<rect x="80" y="${y - 6 - list.markerSize / 2}" width="${list.markerSize}" height="${list.markerSize}" fill="${markerFill}"${markerStroke}/>`);
    } else {
      listParts.push(`<circle cx="84" cy="${y - 6}" r="${list.markerSize / 2}" fill="${markerFill}"/>`);
    }
    listParts.push(`<text x="${84 + list.markerSize + 14}" y="${y}" font-family="${esc(bodyStack)}" font-size="${body - 3}" fill="${text}">${line}</text>`);
  });
  listParts.push('```');
  out.push([
    '### 要点列表',
    listParts.join('\n'),
    `> 标记 ${list.marker}，${list.markerSize}px，填充 ${list.markerFill}。`,
  ].join('\n'));

  return out.join('\n\n');
}

function fragment(token, family, comp) {
  const colors = token.colors || {};
  const roleName = (name) => (name ? `${name}（${role(colors, name, '')}）` : '无');
  const rows = [
    ['KPI 卡', `填充 ${roleName(comp.kpi.fill)} / 描边 ${comp.kpi.border}px / 投影 ${comp.kpi.shadow} / 圆角 ${comp.kpi.radius}`],
    ['表格', `表头 ${roleName(comp.table.headerFill)} / 边框 ${comp.table.border}px / 行线 ${comp.table.rowRule}px / 斑马纹 ${roleName(comp.table.zebra)} / 内边距 ${comp.table.cellPadX}·${comp.table.cellPadY}`],
    ['条形图', `条高 ${comp.chart.barHeight} / 描边 ${comp.chart.barStroke}px / 轴 ${comp.chart.axisRule}px / 网格 ${comp.chart.gridlines} 条`],
    ['折线图', `线宽 ${comp.line.stroke}px / 点径 ${comp.line.dot}px / 面积 ${comp.line.area ? '开' : '关'}`],
    ['引用块', `填充 ${roleName(comp.callout.fill)} / 侧条 ${comp.callout.barWidth}px / 投影 ${comp.callout.shadow} / 圆角 ${comp.callout.radius}`],
    ['要点列表', `标记 ${comp.list.marker} ${comp.list.markerSize}px`],
  ];

  return `# 组件系统 · ${token.name}

家族：\`${family}\`。组件层决定图表、表格、KPI、引用块长什么样；颜色写的是 token 角色名，执行时按 \`themes/tokens/${token.id}.json\` 解析。

| 组件 | 规则 |
| --- | --- |
${rows.map(([k, v]) => `| ${k} | ${v} |`).join('\n')}

## 用法

1. 每一页至少一个组件（图表 / 表格 / KPI / 引用块 / 列表）必须按这张表画，不允许回到"通用卡片 + 细线"的默认样式。
2. 表格的边框、行线、斑马纹只能取表里的值；不要自创 1px 灰框。
3. 条形图的条高、描边、轴线和网格线取表里的值；数值标签用 \`valueSize\`。
4. 组件占位先于装饰：先把图表/表格画对，再加页眉标签和标题线。
5. \`node scripts/check-theme-fidelity.mjs <project>\` 会检查页面里的组件是否越界。

## SVG 片段

${snippets(token, comp)}
`;
}

const tokenFiles = fs.readdirSync(TOKENS).filter((f) => f.endsWith('.json')).sort();
let written = 0;
const stale = [];
const families = {};
const overridden = [];

for (const file of tokenFiles) {
  const tokenPath = path.join(TOKENS, file);
  const token = readJson(tokenPath);
  const { family, components } = componentsFor(token);
  families[family] = (families[family] || 0) + 1;
  if (overrides[token.id]) overridden.push(token.id);

  const before = JSON.stringify(token.components || null);
  if (before !== JSON.stringify(components)) stale.push(token.id);

  if (!checkOnly) {
    token.components = components;
    fs.writeFileSync(tokenPath, JSON.stringify(token, null, 2) + '\n', 'utf8');

    const dir = path.join(PACKAGES, token.id);
    if (fs.existsSync(dir)) {
      fs.writeFileSync(path.join(dir, 'components.json'), JSON.stringify(components, null, 2) + '\n', 'utf8');
      fs.writeFileSync(path.join(dir, 'components.fragment.md'), fragment(token, family, components), 'utf8');
    }
    written += 1;
  }
}

if (checkOnly) {
  if (stale.length) {
    console.error(`[BLOCK] ${stale.length} theme(s) have stale components: ${stale.join(', ')}`);
    console.error('        run: node scripts/build-components.mjs');
    process.exit(1);
  }
  console.log(`[OK] components in sync for ${tokenFiles.length} theme(s)`);
} else {
  console.log(`[OK] components built for ${written} theme(s)`);
  console.log(`     families: ${Object.entries(families).map(([k, v]) => `${k}×${v}`).join(', ')}`);
  console.log(`     theme overrides: ${overridden.length ? overridden.join(', ') : 'none'}`);
  for (const id of stale) console.log(`     updated ${id}`);
}
