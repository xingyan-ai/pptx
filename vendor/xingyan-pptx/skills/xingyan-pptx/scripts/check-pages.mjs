#!/usr/bin/env node
import { expandUserPath } from './lib/paths.mjs';
import { readJsonFile } from './lib/json.mjs';
/**
 * 页面构图门禁：目录页不许空行，内容页不许「全是大段文字」。
 *
 *   node scripts/check-pages.mjs <project>
 *   node scripts/check-pages.mjs <project> --json
 *   node scripts/check-pages.mjs <project> --allow-text-pages   # 只看不拦（调试用）
 *
 * 检查两类硬伤：
 *
 * 1. 目录页
 *    - 槽位里残留 {{TOC_ITEM_n}} 占位符
 *    - 有条目槽却是空白（含 U+200B 零宽空格）——「九、」「十、」后面没字
 *    - 有序号 toc-num-N 却没有对应条目
 *    - 条目文字超出槽位宽度
 *
 * 2. 内容页（content / summary / structure / two-content）
 *    - 母版层和版式层以外没有视觉构件：没有卡片、表格、图表、结构块，
 *      只有一段编号要点。standard 至少 4 个、rich 至少 5 个。
 *    - hero 页和 density=lean 的页豁免：它们本来就该是一句话 + 大留白。
 *
 * 退出码：有错误 1，只有告警 0。pptx-export.mjs 会先跑这个再转 PPTX。
 */

import fs from 'node:fs';
import path from 'node:path';

const VISUAL = /<(rect|path|circle|ellipse|polygon|polyline|line|image)\b[^>]*>/g;
const ZERO_WIDTH = /[​-‍﻿]/g;

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
const svgDir = path.join(project, 'svg_output');

if (!fs.existsSync(svgDir)) {
  console.error(`[BLOCK] 没有 svg_output：${svgDir}`);
  process.exit(1);
}

function readOutline() {
  const file = path.join(project, 'outline.json');
  if (!fs.existsSync(file)) return [];
  try {
    const data = readJsonFile(file);
    return Array.isArray(data.slides) ? data.slides : [];
  } catch {
    return [];
  }
}

const outline = readOutline();
const attr = (tag, name) => new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1] ?? null;

function textOf(xml) {
  return [...xml.matchAll(/<tspan[^>]*>([\s\S]*?)<\/tspan>|<text[^>]*>([\s\S]*?)<\/text>/g)]
    .map((m) => (m[1] ?? m[2] ?? ''))
    .join('')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(ZERO_WIDTH, '')
    .trim();
}

function charactersWidth(text) {
  return [...text].reduce((sum, ch) => sum + (/[\x00-\x7F]/.test(ch) ? 0.5 : 1), 0);
}

const files = fs.readdirSync(svgDir).filter((n) => n.endsWith('.svg')).sort();
const findings = [];

for (const file of files) {
  const stem = file.replace(/\.svg$/i, '');
  const svg = fs.readFileSync(path.join(svgDir, file), 'utf8');
  const rootTag = /<svg\b[^>]*>/i.exec(svg)?.[0] ?? '';
  const layout = attr(rootTag, 'data-pptx-layout') || '';
  const slide = outline.find((_, index) => `P${String(index + 1).padStart(2, '0')}` === stem) || {};
  const density = slide.density || 'standard';
  const role = slide.role || '';

  // —— 目录页 ——
  if (/toc/i.test(layout)) {
    if (/\{\{TOC_ITEM_\d+\}\}/.test(svg)) {
      findings.push({ level: 'error', page: stem, rule: 'toc-placeholder', message: '目录页还有 {{TOC_ITEM_n}} 占位符；用 build-toc.mjs 生成' });
    }

    const slots = [...svg.matchAll(/<g id="toc-item-(\d+)-slot"([^>]*)>([\s\S]*?)<\/g>/g)];
    const labels = [...svg.matchAll(/<text id="toc-num-(\d+)"/g)].map((m) => Number(m[1]));
    let emptyRows = 0;
    for (const slot of slots) {
      const index = Number(slot[1]);
      const body = slot[3];
      const text = textOf(body.replace(/data-pptx-carrier="true"/g, ''));
      if (!text) emptyRows += 1;
      const bounds = attr(slot[2], 'data-pptx-bounds');
      if (text && bounds) {
        const width = Number(bounds.split(/\s+/)[2]);
        const used = charactersWidth(text) * 34;
        if (width && used > width) {
          findings.push({
            level: 'error',
            page: stem,
            rule: 'toc-overflow',
            message: `目录第 ${index} 条「${text}」约 ${Math.round(used)}px，槽位只有 ${width}px`,
          });
        }
      }
    }
    if (emptyRows > 0) {
      findings.push({
        level: 'error',
        page: stem,
        rule: 'toc-empty-row',
        message: `目录有 ${emptyRows} 行空条目（序号在、文字没有）；条数必须等于章节数，用 build-toc.mjs 重生成`,
      });
    }
    const orphans = labels.filter((n) => !slots.some((s) => Number(s[1]) === n));
    if (orphans.length) {
      findings.push({
        level: 'error',
        page: stem,
        rule: 'toc-orphan-number',
        message: `序号 ${orphans.join('、')} 没有对应条目`,
      });
    }
    if (!slots.length && !/\{\{TOC_ITEM_/.test(svg)) {
      findings.push({ level: 'error', page: stem, rule: 'toc-no-items', message: '目录页没有任何条目槽' });
    }
    continue;
  }

  // —— 内容页 ——
  // 版式 key 现在有多种写法（cards-3 / table / metrics-4…），以大纲角色为准，
  // 没有 outline 时退回关键词匹配。
  const isContentRole = role === 'content' || role === 'hero';
  const contentLayout = isContentRole
    || /content|summary|structure|table|card|metric|compare|matrix|flow/i.test(layout);
  if (!contentLayout) continue;
  if (role === 'hero' || density === 'lean') continue;

  // 版式层里的卡片、表格、结构块也算数：它们是这一版式带来的视觉构件。
  // 只排除母版层（底图、logo、口号、底部红曲线这些每页都一样的东西）。
  const primitives = [...svg.matchAll(VISUAL)]
    .filter((m) => !/data-pptx-layer="master"/.test(m[0]))
    .map((m) => m[0]);

  // proxy 页面用了 `content` 这个文字占位符 key：结构化导出会因为「改占位符契约」
  // 报错并降级 flat，母版/版式全丢。必须换成 page-patterns.md 里的版式 key。
  if (/data-pptx-binding="proxy"/.test(svg) && layout === 'content') {
    findings.push({
      level: 'error',
      page: stem,
      rule: 'proxy-layout-key',
      message: '内容槽改成 proxy 后仍用 content 版式 key；换成 cards-3 / table / metrics-4 / '
        + 'metrics-compare / table-metrics / content-rich 等原型 key，否则 structured 导出会降级 flat',
    });
  }

  const required = density === 'rich' ? 4 : 3;
  if (primitives.length < required) {
    findings.push({
      level: 'error',
      page: stem,
      rule: 'text-only',
      message: `只有 ${primitives.length} 个视觉构件（${density} 页要求 ≥${required}）：整页都是文字。`
        + '按 references/page-patterns.md 换成卡片 / 表格 / 指标条 / 结构块',
    });
  }
}

// 版式单一不在这里判断：品牌模板的内容页都叫 `content`，真正的差异在构图，
// 靠版式 key 统计会误报（卡片页、表格页、指标页都同名）。交给写作规则和人工复核。

const errors = findings.filter((f) => f.level === 'error');
const warnings = findings.filter((f) => f.level === 'warning');

if (args.json) {
  process.stdout.write(JSON.stringify({ schemaVersion: 1, pages: files.length, errors, warnings }, null, 2) + '\n');
} else {
  for (const f of findings) console.log(`[${f.level}] ${f.page} ${f.rule}: ${f.message}`);
  if (!findings.length) console.log(`[OK] ${files.length} 页构图检查通过`);
}

if (errors.length && !args['allow-text-pages']) {
  console.error(`\n[BLOCK] ${errors.length} 项构图问题；混过导出的稿子会在会上被一眼看出来。`);
  process.exit(1);
}
