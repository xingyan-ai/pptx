#!/usr/bin/env node
/**
 * Verify authored SVG pages actually follow the selected theme.
 *
 * Usage:
 *   node scripts/check-theme-fidelity.mjs <project> [--theme <id>] [--json]
 *
 * Checks:
 *   1. every fill / stroke hex belongs to the theme palette
 *   2. every stroke-width is one of the theme's declared widths
 *   3. page furniture declared by the theme is present:
 *      tag (a rect of tag.height on every page), rule (content pages),
 *      marker (deck-wide), hardShadow (deck-wide pair offset by dx/dy)
 *   4. footer band when the theme enables it
 *   5. components: a group marked data-component="table|chart|kpi|callout|list"
 *      uses the theme's own border / row-rule / bar-height values, and content
 *      pages carry at least one component
 *
 * Exit code 1 on errors. Writes <project>/validation/theme-fidelity.json.
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
const project = path.resolve(args._[0] || '');
if (!project || !fs.existsSync(project)) {
  console.error('[BLOCK] usage: node scripts/check-theme-fidelity.mjs <project> [--theme <id>] [--json]');
  process.exit(64);
}

const svgDir = path.join(project, 'svg_output');
if (!fs.existsSync(svgDir)) {
  console.error(`[BLOCK] ${svgDir} not found`);
  process.exit(1);
}

let themeId = typeof args.theme === 'string' ? args.theme : '';
if (!themeId) {
  const overlayPath = path.join(project, 'theme_overlay.json');
  if (fs.existsSync(overlayPath)) {
    themeId = JSON.parse(fs.readFileSync(overlayPath, 'utf8')).themeId || '';
  }
}
if (!themeId) {
  console.error('[BLOCK] no theme: pass --theme <id> or write theme_overlay.json first');
  process.exit(1);
}

const tokenPath = path.join(TOKENS, `${themeId}.json`);
if (!fs.existsSync(tokenPath)) {
  console.error(`[BLOCK] unknown theme: ${themeId}`);
  process.exit(1);
}
const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
const colors = token.colors || {};
const dec = token.decoration || {};
const comp = token.components || null;
const furniture = Array.isArray(dec.furniture) ? dec.furniture : [];

const palette = new Set();
for (const value of Object.values(colors)) {
  if (Array.isArray(value)) value.forEach((item) => palette.add(String(item).toUpperCase()));
  else if (typeof value === 'string' && value.startsWith('#')) palette.add(value.toUpperCase());
}

const allowedWidths = new Set();
if (dec.stroke) {
  for (const key of ['width', 'heavy', 'hairline']) {
    const value = Number(dec.stroke[key]);
    if (Number.isFinite(value) && value > 0) allowedWidths.add(value);
  }
}
if (dec.marker && Number(dec.marker.stroke) > 0) allowedWidths.add(Number(dec.marker.stroke));
if (comp) {
  for (const value of [
    comp.kpi && comp.kpi.border,
    comp.table && comp.table.border,
    comp.table && comp.table.rowRule,
    comp.chart && comp.chart.barStroke,
    comp.chart && comp.chart.axisRule,
    comp.line && comp.line.stroke,
    comp.line && comp.line.dotStroke,
    comp.callout && comp.callout.border,
    comp.callout && comp.callout.barWidth,
    comp.list && comp.list.markerStroke,
  ]) {
    const width = Number(value);
    if (Number.isFinite(width) && width > 0) allowedWidths.add(width);
  }
}

const files = fs.readdirSync(svgDir).filter((f) => f.endsWith('.svg')).sort();
const errors = [];
const warnings = [];
const pages = [];

const rectsOf = (svg) => {
  const list = [];
  const re = /<rect\b([^>]*)\/?>/g;
  let m;
  while ((m = re.exec(svg))) {
    const attrs = m[1];
    const num = (name) => {
      const hit = attrs.match(new RegExp(`${name}="(-?[0-9.]+)"`));
      return hit ? Number(hit[1]) : null;
    };
    list.push({ x: num('x'), y: num('y'), w: num('width'), h: num('height'), raw: m[0] });
  }
  return list;
};

let hasMarker = false;
let hasShadowPair = false;

for (const file of files) {
  const svg = fs.readFileSync(path.join(svgDir, file), 'utf8');
  const role = (svg.match(/data-pptx-page-role="([a-z]+)"/) || [])[1] || 'content';
  const rects = rectsOf(svg);
  const fileErrors = [];

  // 1. palette
  for (const match of svg.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{3,8})"/g)) {
    if (!palette.has(match[1].toUpperCase())) {
      fileErrors.push(`color ${match[1]} is not in the ${themeId} palette`);
    }
  }

  // 2. stroke widths
  if (allowedWidths.size) {
    for (const match of svg.matchAll(/stroke-width="([0-9.]+)"/g)) {
      const width = Number(match[1]);
      if (width > 0 && !allowedWidths.has(width)) {
        fileErrors.push(`stroke-width ${width} is not declared by the theme (${[...allowedWidths].sort((a, b) => a - b).join(', ')})`);
      }
    }
  }

  // 3. furniture
  if (furniture.includes('tag') && dec.tag) {
    const found = rects.some((r) => r.h === dec.tag.height && r.w >= 100);
    if (!found) fileErrors.push(`missing header tag (rect h=${dec.tag.height})`);
  }
  if (furniture.includes('rule') && role === 'content' && dec.rule && dec.rule.thickness > 0) {
    const found = rects.some((r) => r.h === dec.rule.thickness && r.w >= 600);
    if (!found) fileErrors.push(`missing title rule (rect h=${dec.rule.thickness})`);
  }
  if (dec.marker && dec.marker.size > 0) {
    if (rects.some((r) => r.w === dec.marker.size && r.h === dec.marker.size)) hasMarker = true;
  }
  if (furniture.includes('hardShadow') && dec.shadow && (dec.shadow.dx || dec.shadow.dy)) {
    for (const a of rects) {
      for (const b of rects) {
        if (a === b || a.w === null || b.w === null) continue;
        if (a.w === b.w && a.h === b.h
          && Math.abs((b.x - a.x) - dec.shadow.dx) < 0.5
          && Math.abs((b.y - a.y) - dec.shadow.dy) < 0.5) {
          hasShadowPair = true;
        }
      }
    }
  }
  if (dec.bands && dec.bands.footer) {
    const found = rects.some((r) => r.w >= 1280 && r.y >= 600);
    if (!found) fileErrors.push('missing footer band');
  }

  // 4. components
  const groups = [...svg.matchAll(/data-component="([a-z]+)"/g)].map((match) => match[1]);
  const componentsSeen = new Set(groups);
  if (comp) {
    const hasStroke = (width) => {
      const wanted = Number(width);
      if (!Number.isFinite(wanted) || wanted <= 0) return true;
      return [...svg.matchAll(/stroke-width="([0-9.]+)"/g)].some((m) => Number(m[1]) === wanted);
    };
    const hasRectHeight = (height) => {
      const wanted = Number(height);
      if (!Number.isFinite(wanted) || wanted <= 0) return true;
      return rects.some((r) => r.h === wanted);
    };
    if (componentsSeen.has('table')) {
      if (!hasStroke(comp.table.border)) fileErrors.push(`table border must be ${comp.table.border}px as declared by the theme`);
      if (!hasRectHeight(comp.table.rowRule)) fileErrors.push(`table row rule must be ${comp.table.rowRule}px as declared by the theme`);
    }
    if (componentsSeen.has('chart')) {
      if (!hasRectHeight(comp.chart.barHeight)) fileErrors.push(`chart bars must be ${comp.chart.barHeight}px tall as declared by the theme`);
      if (!hasStroke(comp.chart.barStroke)) fileErrors.push(`chart bar stroke must be ${comp.chart.barStroke}px as declared by the theme`);
    }
    if (componentsSeen.has('kpi') && !hasStroke(comp.kpi.border)) {
      fileErrors.push(`kpi border must be ${comp.kpi.border}px as declared by the theme`);
    }
    if (componentsSeen.has('callout') && !hasStroke(comp.callout.border)) {
      fileErrors.push(`callout border must be ${comp.callout.border}px as declared by the theme`);
    }
    const hasComponent = ['table', 'chart', 'kpi', 'callout', 'list'].some((name) => componentsSeen.has(name));
    if (role === 'content' && !hasComponent) {
      fileErrors.push('content page has no component group (table / chart / kpi / callout / list)');
    }
  }

  // dedupe per file
  const unique = [...new Set(fileErrors)];
  pages.push({ file, role, errors: unique.length, findings: unique });
  for (const finding of unique) errors.push(`${file}: ${finding}`);
}

if (dec.marker && dec.marker.size > 0 && !hasMarker) {
  errors.push(`deck: no marker block (${dec.marker.size}×${dec.marker.size}) found`);
}
if (furniture.includes('hardShadow') && !hasShadowPair) {
  errors.push(`deck: no hard-shadow pair offset by ${dec.shadow.dx}/${dec.shadow.dy}`);
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  project,
  themeId,
  pages: pages.length,
  furniture,
  allowedStrokeWidths: [...allowedWidths].sort((a, b) => a - b),
  palette: [...palette].sort(),
  errors,
  warnings,
  files: pages,
};

const outDir = path.join(project, 'validation');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'theme-fidelity.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');

if (args.json) {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} else {
  console.log(`theme: ${themeId}`);
  console.log(`pages: ${pages.length}, furniture: ${furniture.join(', ') || 'none'}`);
  if (errors.length) {
    console.error(`[BLOCK] ${errors.length} fidelity error(s)`);
    for (const item of errors.slice(0, 30)) console.error(`  - ${item}`);
    if (errors.length > 30) console.error(`  ... ${errors.length - 30} more`);
  } else {
    console.log('[OK] pages follow the theme decoration system');
  }
  console.log(`report: ${path.join(outDir, 'theme-fidelity.json')}`);
}

process.exit(errors.length ? 1 : 0);
