#!/usr/bin/env node
/**
 * Report what each theme's fonts will actually render as.
 *
 * Usage:
 *   node scripts/check-fonts.mjs --theme <id>
 *   node scripts/check-fonts.mjs --all [--json]
 *
 * For every role the report says:
 *   embed     家族随包内嵌（HTML 里以 data URI 出现）
 *   substitute 厂商字体换成随包的 OFL 近似体
 *   system     只走系统栈（中文字体都是这一类）
 *   at-risk    栈首是厂商字体且没有替代，换台机器就会变样
 *
 * PPTX 不在这个脚本的范围内：PowerPoint for macOS 不认内嵌字体，PPTX 一律用
 * token 里的 `*_stack_ppt`（Arial / PingFang / 微软雅黑 / 宋体）。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFontMap, themeFontReport } from './lib/fonts.mjs';

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
const map = loadFontMap();
const ids = fs.readdirSync(TOKENS).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort();

const wanted = typeof args.theme === 'string' ? [args.theme] : ids;
if (typeof args.theme === 'string' && !ids.includes(args.theme)) {
  console.error(`[BLOCK] unknown theme: ${args.theme}`);
  process.exit(1);
}

const rows = wanted.map((id) => {
  const token = JSON.parse(fs.readFileSync(path.join(TOKENS, `${id}.json`), 'utf8'));
  const report = themeFontReport(token, map);
  return {
    id,
    name: token.name,
    roles: report,
    atRisk: report.some((role) => role.fallbackRisk),
  };
});

if (args.json) {
  process.stdout.write(JSON.stringify({ schemaVersion: 1, themes: rows }, null, 2) + '\n');
} else {
  for (const row of rows) {
    console.log(`${row.id}  ${row.atRisk ? '[RISK]' : ''}`);
    for (const role of row.roles) {
      console.log(`  ${role.role}: ${role.outcome}`);
      console.log(`       stack: ${role.stack}`);
    }
  }
  const risky = rows.filter((row) => row.atRisk);
  console.log('');
  console.log(`[OK] ${rows.length} theme(s) checked, ${risky.length} with a proprietary first face and no substitute`);
  if (risky.length) console.log(`     ${risky.map((row) => row.id).join(', ')}`);
  console.log('     HTML 导出会内嵌 embed / substitute 两类字体；system 类依赖查看者机器。');
}

process.exit(rows.some((row) => row.atRisk && !args.json) ? 0 : 0);
