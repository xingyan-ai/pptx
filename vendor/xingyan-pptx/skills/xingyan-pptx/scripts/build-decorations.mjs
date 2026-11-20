#!/usr/bin/env node
import { readJsonFile } from './lib/json.mjs';
/**
 * Build the decoration layer for every theme.
 *
 * Usage:
 *   node scripts/build-decorations.mjs [--check]
 *
 * Reads themes/decorations.profiles.json (per visualStyle) and
 * themes/decorations.overrides.json (per theme id), then writes:
 *   themes/tokens/<id>.json             -> adds `decoration`
 *   themes/packages/<id>/decoration.json
 *   themes/packages/<id>/decoration.fragment.md
 *
 * --check verifies the generated decoration is already in sync and exits 1
 * when a token is stale, without writing anything.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const TOKENS = path.join(ROOT, 'themes', 'tokens');
const PACKAGES = path.join(ROOT, 'themes', 'packages');
const PROFILES = path.join(ROOT, 'themes', 'decorations.profiles.json');
const OVERRIDES = path.join(ROOT, 'themes', 'decorations.overrides.json');

const checkOnly = process.argv.includes('--check');

function readJson(file) {
  return readJsonFile(file);
}

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

function decorationFor(token) {
  const family = token.visualStyle && profiles[token.visualStyle] ? token.visualStyle : 'editorial';
  const profile = merge({}, profiles[family]);
  const merged = merge(profile, overrides[token.id] || {});
  return { family, decoration: merged };
}

const role = (colors, name, fallback) => {
  if (!name) return fallback;
  if (typeof name === 'string' && name.startsWith('#')) return name;
  return colors[name] || fallback || name;
};

function snippets(token, dec) {
  const colors = token.colors || {};
  const text = role(colors, dec.stroke.color, '#000000');
  const ruleColor = role(colors, dec.rule.color, text);
  const tag = dec.tag;
  const tagFill = tag ? role(colors, tag.fill, text) : null;
  const tagText = tag ? role(colors, tag.text, text) : null;
  const graphFills = (dec.chart.fills || []).map((name, i) => role(colors, name, i === 0 ? text : text));
  const list = [];

  if (tag) {
    const h = tag.height;
    list.push([
      '### 页眉标签',
      '```svg',
      `<rect x="64" y="64" width="170" height="${h}" fill="${tagFill}"${tag.stroke ? ` stroke="${text}" stroke-width="${tag.stroke}"` : ''}/>`,
      `<text x="${64 + tag.paddingX}" y="${64 + Math.round(h / 2) + Math.round(tag.fontSize * 0.36)}" font-family="${(token.typography || {}).body_stack || 'sans-serif'}" font-size="${tag.fontSize}" font-weight="${tag.weight}" fill="${tagText}">标签文字</text>`,
      '```',
    ].join('\n'));
  }

  if (dec.rule.thickness > 0) {
    list.push([
      '### 标题分隔线',
      '```svg',
      `<rect x="64" y="166" width="1152" height="${dec.rule.thickness}" fill="${ruleColor}"/>`,
      '```',
    ].join('\n'));
  }

  if (dec.marker.size > 0) {
    list.push([
      '### 要点标记块',
      '```svg',
      `<rect x="700" y="212" width="${dec.marker.size}" height="${dec.marker.size}" fill="${role(colors, dec.marker.fill, text)}"${dec.marker.stroke ? ` stroke="${text}" stroke-width="${dec.marker.stroke}"` : ''}/>`,
      '```',
    ].join('\n'));
  }

  if (dec.shadow.dx || dec.shadow.dy) {
    const shadowFill = role(colors, dec.shadow.color, text);
    list.push([
      '### 硬投影卡片',
      '```svg',
      `<rect x="${940 + dec.shadow.dx}" y="${120 + dec.shadow.dy}" width="252" height="312" fill="${shadowFill}"${dec.shadow.opacity < 1 ? ` fill-opacity="${dec.shadow.opacity}"` : ''}/>`,
      `<rect x="940" y="120" width="252" height="312" fill="${tagFill || ruleColor}"${dec.stroke.width ? ` stroke="${text}" stroke-width="${dec.stroke.width}"` : ''}/>`,
      '```',
      '> 投影块先画，卡片后画；偏移量固定，不做模糊。',
    ].join('\n'));
  }

  if (dec.chart.barHeight > 0) {
    list.push([
      '### 条形图',
      '```svg',
      `<rect x="150" y="230" width="440" height="${dec.chart.barHeight}" fill="${graphFills[0]}"${dec.chart.barStroke ? ` stroke="${text}" stroke-width="${dec.chart.barStroke}"` : ''}/>`,
      `<rect x="150" y="298" width="423" height="${dec.chart.barHeight}" fill="${graphFills[1] || graphFills[0]}"${dec.chart.barStroke ? ` stroke="${text}" stroke-width="${dec.chart.barStroke}"` : ''}/>`,
      `<text x="602" y="${248 + Math.round(dec.chart.barHeight / 2)}" font-family="${(token.typography || {}).title_stack || 'sans-serif'}" font-size="${dec.chart.valueSize}" fill="${text}">310</text>`,
      '```',
      `> 条高 ${dec.chart.barHeight}px，填充在 ${(dec.chart.fills || []).join(' / ')} 之间交替。`,
    ].join('\n'));
  }

  if (dec.bands.footer) {
    list.push([
      '### 页脚信息带',
      '```svg',
      `<rect x="0" y="674" width="1280" height="46" fill="${role(colors, dec.bands.footerFill, text)}"/>`,
      `<text x="64" y="703" font-family="${(token.typography || {}).body_stack || 'sans-serif'}" font-size="12" fill="${role(colors, dec.bands.footerText, '#ffffff')}">来源 / 页码</text>`,
      '```',
    ].join('\n'));
  }

  return list.join('\n\n');
}

function fragment(token, family, dec) {
  const colors = token.colors || {};
  const text = role(colors, dec.stroke.color, '#000000');
  const rows = [
    ['描边', dec.stroke.width ? `${dec.stroke.width}px ${text}（重描边 ${dec.stroke.heavy}px，hairline ${dec.stroke.hairline}px）` : `无描边（hairline ${dec.stroke.hairline}px ${role(colors, dec.stroke.color, text)}）`],
    ['硬投影', dec.shadow.dx || dec.shadow.dy ? `${dec.shadow.dx}px / ${dec.shadow.dy}px ${role(colors, dec.shadow.color, text)}，透明度 ${dec.shadow.opacity}` : '无'],
    ['标签', dec.tag ? `${dec.tag.fill} 填充 + ${dec.tag.stroke}px 描边，${dec.tag.fontSize}px / ${dec.tag.weight}，高 ${dec.tag.height}` : '无（用普通 kicker 文字）'],
    ['分隔线', dec.rule.thickness ? `${dec.rule.thickness}px ${role(colors, dec.rule.color, text)}` : '无'],
    ['标记块', `${dec.marker.size}×${dec.marker.size}，${dec.marker.stroke}px 描边，${dec.marker.fill} 填充`],
    ['图表条', `高 ${dec.chart.barHeight}，${dec.chart.barStroke}px 描边，填充 ${(dec.chart.fills || []).join(' / ')}`],
    ['圆角', `${dec.radius}px`],
    ['页面家具', dec.furniture.join('、')],
  ];

  return `# 装饰系统 · ${token.name}

家族：\`${family}\`。颜色写的是 token 角色名，执行时按 \`themes/tokens/${token.id}.json\` 解析成 hex。

| 项 | 规则 |
| --- | --- |
${rows.map(([k, v]) => `| ${k} | ${v} |`).join('\n')}

## 用法

1. 先建立全局背景和一个固定网格：页边距 ${(token.spacing || {}).margin || 64}，列间距 ${(token.spacing || {}).gutter || 28}。
2. 每页按页型套用页面家具；内容可以有变化，家具不能换。
3. 颜色只能取本主题的 palette 角色，不引入新的 hex。
4. 装饰不能挤占关系表达：图、表、对比结构优先于装饰块。

## SVG 片段

${snippets(token, dec)}
`;
}

const tokenFiles = fs.readdirSync(TOKENS).filter((f) => f.endsWith('.json')).sort();
let written = 0;
const stale = [];
const families = {};

for (const file of tokenFiles) {
  const tokenPath = path.join(TOKENS, file);
  const token = readJson(tokenPath);
  const { family, decoration } = decorationFor(token);
  families[family] = (families[family] || 0) + 1;

  const before = JSON.stringify(token.decoration || null);
  const after = JSON.stringify(decoration);
  if (before !== after) stale.push(token.id);

  if (!checkOnly) {
    token.decoration = decoration;
    fs.writeFileSync(tokenPath, JSON.stringify(token, null, 2) + '\n', 'utf8');

    const dir = path.join(PACKAGES, token.id);
    if (fs.existsSync(dir)) {
      fs.writeFileSync(path.join(dir, 'decoration.json'), JSON.stringify(decoration, null, 2) + '\n', 'utf8');
      fs.writeFileSync(path.join(dir, 'decoration.fragment.md'), fragment(token, family, decoration), 'utf8');
    }
    written += 1;
  }
}

if (checkOnly) {
  if (stale.length) {
    console.error(`[BLOCK] ${stale.length} theme(s) have stale decoration: ${stale.join(', ')}`);
    console.error('        run: node scripts/build-decorations.mjs');
    process.exit(1);
  }
  console.log(`[OK] decoration in sync for ${tokenFiles.length} theme(s)`);
} else {
  console.log(`[OK] decoration built for ${written} theme(s)`);
  console.log(`     families: ${Object.entries(families).map(([k, v]) => `${k}×${v}`).join(', ')}`);
  for (const id of stale) console.log(`     updated ${id}`);
}
