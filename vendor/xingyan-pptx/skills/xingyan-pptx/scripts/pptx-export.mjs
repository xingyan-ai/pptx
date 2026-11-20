#!/usr/bin/env node
import { expandUserPath } from './lib/paths.mjs';
import { readJsonFile } from './lib/json.mjs';
/**
 * Local PPTX export bridge.
 *
 * Usage:
 *   node scripts/pptx-export.mjs <project> [--out deck.pptx] [--python <path>]
 *                                 [--force] [--brief] [--no-notes]
 *
 * 门禁分级（默认更宽）：
 *   致命  → 停止（XML 坏、外部图片引用、缺 spec_lock）
 *   其它  → 不停止：结构化稿先尝试自动降级 flat，再导出；内容类问题写进交付说明
 *
 * 退出码：0 导出成功；2 没有可用 Python；3 致命错误
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { PPTX_PROBE, pythonCandidates, pythonEnv } from './lib/python-runtime.mjs';
import { exportFileName } from './lib/deck-name.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENGINE = path.resolve(HERE, '..', 'runtime', 'engine', 'scripts');

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

const FATAL = [
  'not well-formed', 'XML', 'invalid image source', 'External image not found',
  'external reference', 'missing spec_lock', 'does not exist',
];

function classify(errors) {
  const fatal = [];
  const other = [];
  for (const e of errors) {
    if (FATAL.some((k) => e.toLowerCase().includes(k.toLowerCase()))) fatal.push(e);
    else other.push(e);
  }
  return { fatal, other };
}

function resolvePython(args) {
  const candidates = [
    args.python,
    ...pythonCandidates([
      path.join(args._[0] || '.', '.venv-pptx', 'bin', 'python'),
    ]),
  ].filter(Boolean);
  for (const candidate of candidates) {
    const isPath = candidate.includes('/') || candidate.includes('\\');
    if (isPath && !fs.existsSync(candidate)) continue;
    if (spawnSync(candidate, ['-c', PPTX_PROBE], { stdio: 'ignore', windowsHide: true, env: pythonEnv() }).status === 0) return candidate;
  }
  return null;
}

function readReport(project) {
  const file = path.join(project, 'validation', 'svg_quality_report.json');
  if (!fs.existsSync(file)) return null;
  try { return readJsonFile(file); } catch { return null; }
}

function readMode(project) {
  const file = path.join(project, 'spec_lock.md');
  if (!fs.existsSync(file)) return 'unknown';
  const m = /##\s+pptx_structure[\s\S]*?mode:\s*(\w+)/.exec(fs.readFileSync(file, 'utf8'));
  return m ? m[1] : 'unknown';
}

function briefLines(report, limit = 12) {
  const lines = [];
  for (const f of report.files || []) {
    for (const e of f.errors || []) lines.push(`${f.file} | ${e}`);
    if (lines.length >= limit) break;
  }
  for (const [cat, items] of Object.entries(report.project_issues || {})) {
    for (const i of items || []) {
      if (i.severity === 'error') lines.push(`project:${cat} | ${i.message}`);
      if (lines.length >= limit) break;
    }
  }
  return lines.slice(0, limit);
}

const args = parseArgs(process.argv.slice(2));
const project = path.resolve(expandUserPath(args._[0] || ''));
if (!fs.existsSync(project)) {
  console.error('Usage: pptx-export.mjs <project> [--out deck.pptx] [--python <path>] [--force] [--brief]');
  process.exit(1);
}
if (!fs.existsSync(path.join(ENGINE, 'svg_to_pptx.py'))) {
  console.error(`[ERR] engine not found at ${ENGINE}`);
  process.exit(1);
}

const python = resolvePython(args);
if (!python) {
  console.error(`[ERR] no Python runtime with python-pptx/lxml/Pillow/PyYAML.
  Set one explicitly: CLAWHIVE_PPTX_PYTHON=/path/to/python node scripts/pptx-export.mjs <project>`);
  process.exit(2);
}
console.log(`[info] python: ${python}`);

const run = (script, extra) => spawnSync(python, [path.join(ENGINE, script), project, ...extra], { stdio: 'inherit', windowsHide: true, env: pythonEnv() });
const node = (script, extra) => spawnSync('node', [path.join(HERE, script), project, ...extra], { encoding: 'utf8', windowsHide: true });

// ── 0. 降级 flat 会原地剥掉页面里的 data-pptx-* 结构；先快照，导出后还原 ──
// 不还原的话，一次失败的导出会把工程变成不可逆的 flat 稿，母版/版式再也回不来。
const SVG_SNAPSHOT = new Map();
let SPEC_SNAPSHOT = null;
function snapshotSvg() {
  const dir = path.join(project, 'svg_output');
  if (SVG_SNAPSHOT.size || !fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir).filter((n) => n.endsWith('.svg'))) {
    SVG_SNAPSHOT.set(name, fs.readFileSync(path.join(dir, name), 'utf8'));
  }
  const spec = path.join(project, 'spec_lock.md');
  if (fs.existsSync(spec)) SPEC_SNAPSHOT = fs.readFileSync(spec, 'utf8');
}
function restoreSvg() {
  if (!SVG_SNAPSHOT.size) return;
  const dir = path.join(project, 'svg_output');
  for (const [name, source] of SVG_SNAPSHOT) {
    try { fs.writeFileSync(path.join(dir, name), source, 'utf8'); } catch { /* ignore */ }
  }
  if (SPEC_SNAPSHOT !== null) {
    try { fs.writeFileSync(path.join(project, 'spec_lock.md'), SPEC_SNAPSHOT, 'utf8'); } catch { /* ignore */ }
  }
  SVG_SNAPSHOT.clear();
  SPEC_SNAPSHOT = null;
}
process.on('exit', restoreSvg);

// ── 1. spec_lock 预检：能修就修，修不好就降级 flat，不阻断 ──
const pre = node('gen-spec-lock.mjs', ['--check']);
if (pre.status !== 0) {
  const gen = node('gen-spec-lock.mjs', []);
  if (gen.stdout) process.stdout.write(gen.stdout);
  if (node('gen-spec-lock.mjs', ['--check']).status !== 0) {
    console.log('[warn] 结构契约补不齐，切到 flat 模式导出（PPT 里不会有母版/版式）');
    snapshotSvg();
    const flat = node('gen-spec-lock.mjs', ['--flat']);
    if (flat.stdout) process.stdout.write(flat.stdout);
    spawnSync('node', [path.join(HERE, 'strip-structure.mjs'), project], { stdio: 'inherit', windowsHide: true });
  }
}

// ── 2. 质量门禁：分级 ──
console.log('[info] quality gate ...');
run('svg_quality_checker.py', ['--canonical-authoring', '--stage', 'final', '--json']);
let report = readReport(project);
let errors = report?.summary?.errors ?? 0;
let { fatal, other } = classify(
  (report?.files || []).flatMap((f) => f.errors || []).concat(
    Object.values(report?.project_issues || {}).flat()
      .filter((i) => i.severity === 'error').map((i) => i.message)),
);

if (fatal.length && !args.force) {
  console.error('[BLOCK] 致命错误，必须修复后再导出：');
  for (const e of fatal.slice(0, 8)) console.error(' - ' + e);
  process.exit(3);
}

// Structured release export requires a *clean* quality report — the engine
// refuses to compile structured pages against a failed one. So every error,
// content-level or not, costs the master and layouts; what we can do is say
// exactly which findings caused it instead of downgrading silently.
let mode = readMode(project);
const degradeReasons = [];
if (errors > 0 && mode === 'structured') {
  degradeReasons.push(...(other.length ? other : fatal).map((e) => e.slice(0, 160)));
  console.log(`[info] 结构化导出要求 0 error；当前 ${errors} 项，降级 flat（母版/版式将不可用）`);
  for (const reason of degradeReasons.slice(0, 5)) console.log('  - ' + reason.slice(0, 120));
  snapshotSvg();
  node('gen-spec-lock.mjs', ['--flat']);
  spawnSync('node', [path.join(HERE, 'strip-structure.mjs'), project], { stdio: 'inherit', windowsHide: true });
  run('svg_quality_checker.py', ['--canonical-authoring', '--stage', 'final', '--json']);
  report = readReport(project);
  errors = report?.summary?.errors ?? 0;
  ({ fatal, other } = classify(
    (report?.files || []).flatMap((f) => f.errors || []).concat(
      Object.values(report?.project_issues || {}).flat()
        .filter((i) => i.severity === 'error').map((i) => i.message)),
  ));
  mode = 'flat';
  if (fatal.length && !args.force) {
    console.error('[BLOCK] 致命错误（flat 重试后仍存在）：');
    for (const e of fatal.slice(0, 8)) console.error(' - ' + e);
    process.exit(3);
  }
}

if (other.length) {
  console.log(`[warn] ${other.length} 项内容问题照常导出，交付说明里会列出：`);
  for (const e of other.slice(0, 8)) console.log('  - ' + e.slice(0, 120));
}

// ── 2.5 构图门禁：目录空行、整页只有文字 —— 阻断，不是提醒 ──
// 这两类问题在导出说明里列一万次也没人回头改，必须在转换前停。
{
  const check = spawnSync('node', [path.join(HERE, 'check-pages.mjs'), project, ...(args.force ? ['--allow-text-pages'] : [])], { encoding: 'utf8', windowsHide: true });
  if (check.stdout) process.stdout.write(check.stdout);
  if (check.stderr) process.stderr.write(check.stderr);
  if (check.status !== 0 && !args.force) {
    console.error('[BLOCK] 构图门禁未通过；修好页面再导出，或用 --force 强制导出');
    process.exit(3);
  }
}

// ── 2.6 质量门禁的纯文字页摘要（写进交付说明，便于复核） ──
const textOnly = [];
{
  const dir = path.join(project, 'svg_output');
  if (fs.existsSync(dir)) {
    for (const name of fs.readdirSync(dir).filter((n) => n.endsWith('.svg')).sort()) {
      const svg = fs.readFileSync(path.join(dir, name), 'utf8');
      const layout = /data-pptx-layout="([^"]*)"/.exec(svg)?.[1] || '';
      if (!/content|summary|structure/.test(layout)) continue;
      const visuals = (svg.match(/<(rect|path|circle|polygon|line|image)\b/g) || []).length;
      if (visuals <= 2) textOnly.push(`${name.replace(/\.svg$/, '')} (${layout}) 只有文字，没有卡片/表格/图表`);
    }
  }
}

// ── 3. 导出 ──
const out = path.resolve(args.out || exportFileName(project, 'pptx'));
fs.mkdirSync(path.dirname(out), { recursive: true });
const extra = ['-o', out];
if (!args['no-notes']) extra.push('--with-notes');
if (mode === 'structured') extra.push('--pptx-structure', 'structured');
// The engine rejects this flag together with --pptx-structure structured, so a
// content error would otherwise make the structured command invalid and force a
// flat fallback. Structured export is strict; the flag only applies to flat.
if (mode !== 'structured' && (errors > 0 || args.force)) extra.push('--enable-dangerous-nonconforming-svg-export');

console.log('[info] converting svg -> pptx ...');
let build = run('svg_to_pptx.py', extra);
// The converter itself can reject a structured project (for example a template
// whose placeholders drifted). Retry flat once instead of failing outright.
if (build.status !== 0 && mode === 'structured' && !args.force) {
  console.log('[warn] 结构化转换失败，降级 flat 重试（母版/版式将不可用）');
  degradeReasons.push('结构化转换失败（引擎拒绝或占位符契约不匹配）');
  snapshotSvg();
  node('gen-spec-lock.mjs', ['--flat']);
  spawnSync('node', [path.join(HERE, 'strip-structure.mjs'), project], { stdio: 'inherit', windowsHide: true });
  mode = 'flat';
  const flatExtra = extra.filter((a, i, arr) => a !== '--pptx-structure' && arr[i - 1] !== '--pptx-structure');
  if (!flatExtra.includes('--enable-dangerous-nonconforming-svg-export')) flatExtra.push('--enable-dangerous-nonconforming-svg-export');
  build = run('svg_to_pptx.py', flatExtra);
}
if (build.status !== 0) {
  console.error('[ERR] conversion failed');
  process.exit(1);
}

const briefFile = path.join(project, 'validation', 'export-brief.txt');
fs.writeFileSync(briefFile, [
  `mode: ${mode}`,
  `errors: ${errors}`,
  ...(degradeReasons.length ? ['', '降级原因（结构化导出要求 0 error）：', ...degradeReasons] : []),
  ...(other.length ? ['', '内容问题：', ...other] : []),
  ...(textOnly.length ? ['', '纯文字页：', ...textOnly] : []),
].join('\n'), 'utf8');
console.log(`[OK] ${out}`);
console.log(`[brief] mode=${mode} errors=${errors} -> ${briefFile}`);
