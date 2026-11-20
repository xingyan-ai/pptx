#!/usr/bin/env node
/**
 * Render a theme's decoration system as a 1280×720 SVG sample page.
 *
 * Usage:
 *   node scripts/theme-furniture.mjs <theme-id> [--out <file>] [--all <dir>]
 *
 * The sample page is a reference for the Executor: it shows the header tag,
 * title rule, marker blocks, hard-shadow card, chart bars and footer band with
 * the theme's own tokens. It is not deck content.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const TOKENS = path.join(ROOT, 'themes', 'tokens');

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

const args = parseArgs(process.argv.slice(2));
const esc = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

function loadToken(id) {
  const file = path.join(TOKENS, `${id}.json`);
  if (!fs.existsSync(file)) {
    console.error(`[BLOCK] unknown theme: ${id}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function color(colors, value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'string' && value.startsWith('#')) return value;
  return colors[value] || fallback || value;
}

function render(token) {
  const c = token.colors || {};
  const ty = token.typography || {};
  const dec = token.decoration || {};
  const comp = token.components || {};
  const bg = c.background || '#FFFFFF';
  const text = c.text || '#111111';
  const muted = c.textMuted || text;
  const surfaceAlt = c.surfaceAlt || bg;
  const ruleColor = color(c, dec.rule && dec.rule.color, text);
  const strokeColor = color(c, dec.stroke && dec.stroke.color, text);
  const strokeWidth = (dec.stroke && dec.stroke.width) || 0;
  const hairline = (dec.stroke && dec.stroke.hairline) || 1;
  const radius = dec.radius || 0;

  const titleStack = ty.title_stack || 'sans-serif';
  const bodyStack = ty.body_stack || 'sans-serif';
  const titleSize = ty.title || 42;
  const bodySize = ty.body || 20;
  const annotation = ty.annotation || 12;
  const headingWeight = ty.heading_weight || 700;

  const tag = dec.tag;
  const tagHeight = tag ? tag.height : 0;
  const tagFont = tag ? tag.fontSize : annotation;
  const tagPad = tag ? tag.paddingX : 12;
  const tagFill = tag ? color(c, tag.fill, surfaceAlt) : bg;
  const tagText = tag ? color(c, tag.text, text) : text;
  const ruleThickness = (dec.rule && dec.rule.thickness) || 0;
  const shadow = dec.shadow || { dx: 0, dy: 0, color: 'text', opacity: 0 };
  const shadowFill = color(c, shadow.color, text);
  const footer = dec.bands && dec.bands.footer;
  const parts = [];

  const kpi = comp.kpi || { fill: null, border: 0, borderColor: 'text', shadow: 'none', radius: 0, numberScale: 1, labelCase: 'none' };
  const table = comp.table || { headerFill: null, headerText: 'text', border: 0, borderColor: 'text', rowRule: 1, rowRuleColor: 'rule', zebra: null, cellPadX: 12, cellPadY: 9, radius: 0 };
  const chart = comp.chart || { barHeight: (dec.chart && dec.chart.barHeight) || 14, barStroke: 0, barFill: ['accent'], axisRule: 1, axisColor: 'text', gridlines: 0, gridColor: 'rule', valueSize: 14, valueWeight: 600, labelSize: 17 };
  const callout = comp.callout || { fill: null, text: 'text', border: 0, borderColor: 'text', shadow: 'none', barWidth: 0, barColor: 'accent', radius: 0 };
  const list = comp.list || { marker: 'dot', markerSize: 6, markerStroke: 0, markerFill: 'accent' };

  const hardShadow = (target) => {
    if (target.shadow !== 'hard' || (!shadow.dx && !shadow.dy)) return '';
    const dx = shadow.dx || 8;
    const dy = shadow.dy || 8;
    return `<rect x="${target.x + dx}" y="${target.y + dy}" width="${target.w}" height="${target.h}" rx="${target.radius}" fill="${shadowFill}"/>`;
  };

  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720" data-theme-sample="${esc(token.id)}">`);
  parts.push(`  <rect x="0" y="0" width="1280" height="720" fill="${bg}"/>`);

  // header
  parts.push('  <g id="header">');
  if (tag) {
    parts.push(`    <rect x="64" y="56" width="190" height="${tagHeight}" rx="${radius}" fill="${tagFill}"${tag.stroke ? ` stroke="${strokeColor}" stroke-width="${tag.stroke}"` : ''}/>`);
    parts.push(`    <text x="${64 + tagPad}" y="${56 + Math.round(tagHeight / 2) + Math.round(tagFont * 0.36)}" font-family="${esc(bodyStack)}" font-size="${tagFont}" font-weight="${tag.weight}" fill="${tagText}">03 · COMPONENTS</text>`);
  }
  parts.push(`    <text x="64" y="146" font-family="${esc(titleStack)}" font-size="${titleSize}" font-weight="${headingWeight}" fill="${text}">${esc(token.name)}</text>`);
  parts.push('  </g>');

  if (ruleThickness > 0) {
    parts.push(`  <g id="rule"><rect x="64" y="166" width="1152" height="${ruleThickness}" fill="${ruleColor}"/></g>`);
  }

  // --- bar chart (left) ---
  const axisColor = color(c, chart.axisColor, text);
  const gridColor = color(c, chart.gridColor, ruleColor);
  const barFills = (chart.barFill || ['accent']).map((name, i) => color(c, name, i ? surfaceAlt : color(c, 'accent', text)));
  const bars = [['叙事', 92, 400], ['证据', 78, 340], ['数据', 64, 278], ['节奏', 50, 218]];
  const chartBottom = 400;
  parts.push('  <g id="chart" data-component="chart">');
  parts.push(`    <text x="64" y="196" font-family="${esc(bodyStack)}" font-size="${annotation}" fill="${muted}">条形图</text>`);
  if (chart.gridlines > 0) {
    for (let i = 1; i <= chart.gridlines; i += 1) {
      const x = 160 + Math.round((540 * i) / (chart.gridlines + 1));
      parts.push(`    <rect x="${x}" y="208" width="1" height="${chartBottom - 208}" fill="${gridColor}" opacity="0.55"/>`);
    }
  }
  bars.forEach(([label, value, width], i) => {
    const y = 214 + i * 46;
    const barH = chart.barHeight;
    parts.push(`    <text x="64" y="${y + Math.round(barH / 2) + 5}" font-family="${esc(bodyStack)}" font-size="${chart.labelSize}" fill="${text}">${label}</text>`);
    parts.push(`    <rect x="160" y="${y}" width="${width}" height="${barH}" fill="${barFills[i % barFills.length]}"${chart.barStroke ? ` stroke="${axisColor}" stroke-width="${chart.barStroke}"` : ''}/>`);
    parts.push(`    <text x="${168 + width}" y="${y + Math.round(barH / 2) + 5}" font-family="${esc(bodyStack)}" font-size="${chart.valueSize}" font-weight="${chart.valueWeight}" fill="${text}">${value}</text>`);
  });
  if (chart.axisRule > 0) {
    parts.push(`    <rect x="160" y="${chartBottom}" width="540" height="${chart.axisRule}" fill="${axisColor}"/>`);
  }
  parts.push('  </g>');

  // --- table (right) ---
  const tableX = 740;
  const tableY = 200;
  const tableW = 476;
  const rowH = 44;
  const cells = [
    ['核心指标', 'Q2', 'Q3', '环比'],
    ['有效任务', '1,284', '1,736', '+35%'],
    ['留存率', '41%', '52%', '+11pt'],
    ['人均耗时', '26min', '18min', '−31%'],
  ];
  const colX = [tableX + 18, tableX + 210, tableX + 310, tableX + 404];
  const headerFill = table.headerFill ? color(c, table.headerFill, text) : null;
  const headerText = headerFill ? color(c, table.headerText, bg) : text;
  const borderColor = table.border > 0 ? color(c, table.borderColor, text) : null;
  const rowRuleColor = color(c, table.rowRuleColor, ruleColor);
  parts.push('  <g id="table" data-component="table">');
  parts.push(`    <text x="${tableX}" y="186" font-family="${esc(bodyStack)}" font-size="${annotation}" fill="${muted}">表格</text>`);
  if (headerFill) {
    parts.push(`    <rect x="${tableX}" y="${tableY}" width="${tableW}" height="${rowH}" rx="${table.radius}" fill="${headerFill}"/>`);
  }
  if (table.zebra) {
    parts.push(`    <rect x="${tableX}" y="${tableY + rowH * 2}" width="${tableW}" height="${rowH}" fill="${color(c, table.zebra, surfaceAlt)}"/>`);
  }
  cells.forEach((row, r) => {
    const y = tableY + r * rowH;
    const isHeader = r === 0;
    row.forEach((cell, i) => {
      parts.push(`    <text x="${colX[i]}" y="${y + Math.round(rowH / 2) + 5}" font-family="${esc(bodyStack)}" font-size="${isHeader ? annotation + 3 : annotation + 4}" font-weight="${isHeader ? 700 : 400}" fill="${isHeader ? headerText : (i === 0 ? text : muted)}">${esc(cell)}</text>`);
    });
    if (table.rowRule > 0) {
      parts.push(`    <rect x="${tableX}" y="${y + rowH}" width="${tableW}" height="${table.rowRule}" fill="${isHeader && !headerFill ? text : rowRuleColor}"/>`);
    }
  });
  if (borderColor) {
    parts.push(`    <rect x="${tableX + table.border / 2}" y="${tableY + table.border / 2}" width="${tableW - table.border}" height="${rowH * cells.length - table.border}" rx="${table.radius}" fill="none" stroke="${borderColor}" stroke-width="${table.border}"/>`);
  }
  parts.push('  </g>');

  // --- KPI tiles ---
  const kpiTop = 470;
  const kpiW = 286;
  const kpiH = 112;
  [[64, '224', '品牌提及'], [372, '3.4×', '心智差距']].forEach(([x, value, label], i) => {
    const fill = kpi.fill ? color(c, kpi.fill, surfaceAlt) : bg;
    parts.push(`  <g id="kpi-${i + 1}" data-component="kpi">`);
    if (kpi.shadow === 'hard') {
      parts.push(`    <rect x="${x + (shadow.dx || 8)}" y="${kpiTop + (shadow.dy || 8)}" width="${kpiW}" height="${kpiH}" rx="${kpi.radius}" fill="${shadowFill}"/>`);
    }
    parts.push(`    <rect x="${x}" y="${kpiTop}" width="${kpiW}" height="${kpiH}" rx="${kpi.radius}" fill="${fill}"${kpi.border > 0 ? ` stroke="${color(c, kpi.borderColor, text)}" stroke-width="${kpi.border}"` : ''}/>`);
    parts.push(`    <text x="${x + 22}" y="${kpiTop + 62}" font-family="${esc(titleStack)}" font-size="${Math.round((ty.metric || 36) * (kpi.numberScale || 1))}" font-weight="${headingWeight}" fill="${color(c, 'primary', text)}">${value}</text>`);
    parts.push(`    <text x="${x + 22}" y="${kpiTop + 90}" font-family="${esc(bodyStack)}" font-size="${annotation + 2}" fill="${muted}">${kpi.labelCase === 'upper' ? label.toUpperCase() : label}</text>`);
    parts.push('  </g>');
  });

  // --- callout ---
  const callX = 700;
  const callY = 470;
  const callW = 516;
  const callH = 112;
  const callFill = callout.fill ? color(c, callout.fill, surfaceAlt) : null;
  const callText = callFill ? color(c, callout.text, text) : text;
  parts.push('  <g id="callout" data-component="callout">');
  if (callout.shadow === 'hard') {
    parts.push(`    <rect x="${callX + (shadow.dx || 8)}" y="${callY + (shadow.dy || 8)}" width="${callW}" height="${callH}" rx="${callout.radius}" fill="${shadowFill}"/>`);
  }
  parts.push(`    <rect x="${callX}" y="${callY}" width="${callW}" height="${callH}" rx="${callout.radius}" fill="${callFill || 'none'}"${callout.border > 0 ? ` stroke="${color(c, callout.borderColor, text)}" stroke-width="${callout.border}"` : ''}/>`);
  if (callout.barWidth > 0) {
    parts.push(`    <rect x="${callX}" y="${callY}" width="${callout.barWidth}" height="${callH}" fill="${color(c, callout.barColor, color(c, 'accent', text))}"/>`);
  }
  const callInner = callX + (callout.barWidth > 0 ? callout.barWidth + 20 : 22);
  parts.push(`    <text x="${callInner}" y="${callY + 44}" font-family="${esc(titleStack)}" font-size="${bodySize - 4}" font-weight="${headingWeight}" fill="${callText}">判断先行，证据在后</text>`);
  parts.push(`    <text x="${callInner}" y="${callY + 74}" font-family="${esc(bodyStack)}" font-size="${annotation + 2}" fill="${callFill ? callText : muted}">一页只留一个主导对象，装饰不替代表达。</text>`);
  parts.push('  </g>');

  // --- list ---
  const markerFill = color(c, list.markerFill, color(c, 'accent', text));
  const markerStroke = list.markerStroke > 0 ? ` stroke="${strokeColor}" stroke-width="${list.markerStroke}"` : '';
  parts.push('  <g id="list" data-component="list">');
  ['判断先行，证据在后', '一页只留一个主导对象', '装饰不替代关系表达'].forEach((line, i) => {
    const y = 610 + i * 24;
    if (list.marker === 'circle') {
      parts.push(`    <circle cx="${64 + list.markerSize / 2}" cy="${y - 5}" r="${list.markerSize / 2}" fill="${markerFill}"${markerStroke}/>`);
    } else {
      parts.push(`    <rect x="64" y="${y - 5 - list.markerSize / 2}" width="${list.markerSize}" height="${list.markerSize}" fill="${markerFill}"${markerStroke}/>`);
    }
    parts.push(`    <text x="${64 + list.markerSize + 14}" y="${y}" font-family="${esc(bodyStack)}" font-size="${annotation + 3}" fill="${text}">${line}</text>`);
  });
  parts.push('  </g>');

  // footer
  if (footer) {
    const bandFill = color(c, dec.bands.footerFill, text);
    const bandText = color(c, dec.bands.footerText, bg);
    parts.push('  <g id="footer">');
    parts.push(`    <rect x="0" y="678" width="1280" height="42" fill="${bandFill}"/>`);
    parts.push(`    <text x="64" y="705" font-family="${esc(bodyStack)}" font-size="${annotation}" fill="${bandText}">${esc(token.name)} · components</text>`);
    parts.push('  </g>');
  } else {
    parts.push('  <g id="footer">');
    parts.push(`    <line x1="64" y1="678" x2="1216" y2="678" stroke="${ruleColor}" stroke-width="${hairline}"/>`);
    parts.push(`    <text x="64" y="702" font-family="${esc(bodyStack)}" font-size="${annotation}" fill="${muted}">${esc(token.name)} · components</text>`);
    parts.push('  </g>');
  }

  parts.push('</svg>');
  return parts.join('\n') + '\n';
}

const themeId = typeof args._[0] === 'string' ? args._[0] : '';
if (!themeId && typeof args.all !== 'string' && typeof args.gallery !== 'string') {
  console.error('Usage: node scripts/theme-furniture.mjs <theme-id> [--out <file>] | --all <dir> | --gallery <file>');
  process.exit(64);
}

if (typeof args.gallery === 'string') {
  const ids = fs.readdirSync(TOKENS)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort();
  const cards = ids.map((id) => {
    const token = loadToken(id);
    return `  <figure>\n    <figcaption>${esc(token.name)} <span>${esc(token.visualStyle || '')}</span></figcaption>\n${render(token)}\n  </figure>`;
  }).join('\n');
  const html = `<!doctype html>
<html lang="zh-Hans">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ClawHive Deck Studio · 38 套主题装饰样本</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; padding: 24px; background: #ecebe7; font: 14px/1.5 -apple-system, "PingFang SC", sans-serif; color: #222; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  p.note { margin: 0 0 24px; color: #666; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(520px, 1fr)); gap: 20px; }
  figure { margin: 0; background: #fff; border: 1px solid #d6d4cd; border-radius: 6px; overflow: hidden; }
  figcaption { display: flex; justify-content: space-between; gap: 12px; padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #e6e4dd; }
  figcaption span { font-weight: 400; color: #888; }
  svg { display: block; width: 100%; height: auto; }
</style>
<h1>38 套主题装饰样本</h1>
<p class="note">每张是同一份内容骨架，只换主题的 decoration 与 token。用 <code>--scope design</code> 应用后再写页面，效果以主题为准。</p>
<div class="grid">
${cards}
</div>
</html>
`;
  const out = path.resolve(args.gallery);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html, 'utf8');
  console.log(`[OK] ${ids.length} theme sample(s) -> ${out}`);
} else if (typeof args.all === 'string') {
  const dir = path.resolve(args.all);
  fs.mkdirSync(dir, { recursive: true });
  const ids = fs.readdirSync(TOKENS)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''))
    .sort();
  for (const id of ids) {
    fs.writeFileSync(path.join(dir, `${id}.svg`), render(loadToken(id)), 'utf8');
  }
  console.log(`[OK] ${ids.length} theme sample(s) -> ${dir}`);
} else {
  const svg = render(loadToken(themeId));
  const out = typeof args.out === 'string' ? path.resolve(args.out) : null;
  if (out) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, svg, 'utf8');
    console.log(`[OK] ${themeId} -> ${out}`);
  } else {
    process.stdout.write(svg);
  }
}
