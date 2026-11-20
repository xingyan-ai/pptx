#!/usr/bin/env node
import { expandUserPath } from './lib/paths.mjs';
import { readJsonFile } from './lib/json.mjs';
/**
 * One-shot brand-deck build: compose → build-toc → gen-spec-lock → check-pages
 * → PPTX and/or HTML. This replaces the agent's long chain of individual
 * commands and repeated quality-gate runs.
 *
 *   node scripts/build-deck.mjs <project> --format pptx
 *   node scripts/build-deck.mjs <project> --format both
 *   node scripts/build-deck.mjs <project> --format html --only P07
 *   node scripts/build-deck.mjs <project> --format both --python /path/to/python
 *
 * Exit 0 only when every requested step passed. On failure it prints the
 * failing step's output and stops, so the next action is obvious.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { pythonEnv, resolvePython as resolvePythonImpl } from './lib/python-runtime.mjs';
import { exportFileName } from './lib/deck-name.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const ENGINE = path.join(ROOT, 'runtime', 'engine', 'scripts');

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
if (!project || !fs.existsSync(path.join(project, 'outline.json'))) {
  console.error('Usage: build-deck.mjs <project> [--format pptx|html|both] [--only P07] [--python <path>] [--force]');
  process.exit(1);
}

const formatArg = String(args.format || 'pptx').toLowerCase();
const formats = formatArg === 'both' ? ['pptx', 'html'] : formatArg.split(',').map((x) => x.trim()).filter(Boolean);
if (!formats.length || formats.some((f) => !['pptx', 'html'].includes(f))) {
  console.error(`[ERR] 不支持的 --format：${args.format}`);
  process.exit(1);
}

function resolvePython(code) {
  return resolvePythonImpl({
    extra: [
      args.python,
      process.env.CLAWHIVE_SOURCE_PYTHON,
      path.join(project, '.venv-pptx', 'bin', 'python'),
      path.join(project, '.venv-pptx', 'Scripts', 'python.exe'),
    ].filter(Boolean),
    probeCode: code,
  });
}

const steps = [];
function record(name, ok, detail = '') {
  steps.push({ name, ok, detail });
}

function runNode(script, extra = [], { label, quiet = false, allowFail = false } = {}) {
  const result = spawnSync('node', [path.join(HERE, script), project, ...extra], { encoding: 'utf8', windowsHide: true });
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  if (!quiet && output) {
    const lines = output.split('\n');
    const keep = lines.filter((line) =>
      /^\[(ok|OK|warn|WARN|error|ERROR|BLOCK|brief|summary|source|out)\]|^mode=|^wrote |^\[PPTX\]|^\[REPORT\]|^\[Done\]/.test(line)
      || /structure:|Saved:|\[BLOCK\]|\[ERROR\]/.test(line));
    if (keep.length) console.log(keep.slice(-20).join('\n'));
  }
  if (result.status !== 0 && !allowFail) {
    console.error(`\n[FAIL] ${label}`);
    console.error(output.split('\n').slice(-40).join('\n'));
    record(label, false, output.split('\n').slice(-5).join(' '));
    return false;
  }
  record(label, result.status === 0, '');
  return result.status === 0;
}

function runPython(script, python, extra = [], { label } = {}) {
  const result = spawnSync(python, [path.join(ENGINE, script), project, ...extra], { encoding: 'utf8', windowsHide: true, env: pythonEnv() });
  const output = `${result.stdout || ''}${result.stderr || ''}`.trim();
  if (output) console.log(output.split('\n').slice(-8).join('\n'));
  if (result.status !== 0) {
    console.error(`\n[FAIL] ${label}`);
    console.error(output.split('\n').slice(-40).join('\n'));
    record(label, false, output.split('\n').slice(-5).join(' '));
    return false;
  }
  record(label, true, '');
  return true;
}

function isBrandProject() {
  const file = path.join(project, 'template.json');
  if (!fs.existsSync(file)) return false;
  try {
    const data = readJsonFile(file);
    return data.type === 'brand' || data.kind === 'brand';
  } catch {
    return false;
  }
}
const brandProject = isBrandProject();
const layoutSystem = String(args['layout-system'] || (args.core ? 'core' : 'brand')).toLowerCase();
if (!['brand', 'core'].includes(layoutSystem)) {
  console.error(`[ERR] 不支持的 --layout-system：${layoutSystem}（brand / core）`);
  process.exit(1);
}
const themeId = args.theme ? String(args.theme) : 'zhongtai-brand';

// One stamp per build so the .pptx and .html of the same run share a suffix.
const exportStamp = new Date();
const singlePage = Boolean(args.only);
const only = singlePage ? ['--only', String(args.only).toUpperCase().padStart(2, '0')] : [];

// ── 0a: brand template bootstrap (no manual apply_template) ─────────
if (layoutSystem === 'brand') {
  let themeId = null;
  try {
    const selection = readJsonFile(path.join(project, 'theme_selection.json'));
    themeId = selection?.id || null;
  } catch { /* no theme selection */ }
  const hasTemplates = fs.existsSync(path.join(project, 'templates'))
    && fs.readdirSync(path.join(project, 'templates')).some((name) => name.endsWith('.svg'));
  if (!hasTemplates && (!themeId || themeId === 'zhongtai-brand')) {
    if (!runNode('prepare-brand-project.mjs', [], { label: 'prepare-brand-project' })) process.exit(1);
  }
}

// ── 0: story projection + brand contract (skip for a single-page fix) ─
if (!singlePage) {
  if (layoutSystem === 'core') {
    let prepared = false;
    try {
      const meta = readJsonFile(path.join(project, 'template.json'));
      prepared = meta.type === 'layout' && fs.existsSync(path.join(project, 'templates'));
    } catch { prepared = false; }
    if (!prepared && !runNode('prepare-core-project.mjs', ['--theme', themeId], { label: 'prepare-core-project' })) process.exit(1);
  }
  if (!runNode('outline-check.mjs', [], { label: 'outline-check' })) process.exit(1);
  if (!runNode('outline-to-spec.mjs', [], { label: 'outline-to-spec' })) process.exit(1);
  if (!runNode('fill-brand-contract.mjs', [], { label: 'fill-brand-contract' })) process.exit(1);
  // A previous run can die after compose (for example build-toc blocks on a long
  // TOC entry). Those stale pages then make check-design-spec compare the new
  // outline against an incomplete page set, so a plain retry fails for an
  // unrelated reason. Rebuild from an empty svg_output unless it is a one-page fix.
  // Only the composed flows own svg_output; a hand-authored page set is never
  // passed through build-deck, so clearing here cannot delete authored work.
  const composedFlow = layoutSystem === 'brand' || layoutSystem === 'core';
  const svgDir = path.join(project, 'svg_output');
  if (composedFlow && fs.existsSync(svgDir)) {
    const stale = fs.readdirSync(svgDir).filter((name) => name.endsWith('.svg'));
    for (const name of stale) fs.rmSync(path.join(svgDir, name), { force: true });
    if (stale.length) console.log(`[info] cleared ${stale.length} stale page(s) from svg_output before recomposing`);
  }
  if (!runNode('check-design-spec.mjs', [], { label: 'check-design-spec' })) process.exit(1);
}

// ── 1–5: deterministic page pipeline ────────────────────────────────
const composeScript = layoutSystem === 'core' ? 'compose-core.mjs' : 'compose-deck.mjs';
if (!runNode(composeScript, ['--check', ...only], { label: `${composeScript} --check` })) process.exit(1);
if (!runNode(composeScript, only, { label: composeScript })) process.exit(1);
if (!runNode('build-toc.mjs', [], { label: 'build-toc' })) process.exit(1);
if (!runNode('gen-spec-lock.mjs', [], { label: 'gen-spec-lock' })) process.exit(1);
if (!runNode('check-pages.mjs', [], { label: 'check-pages' })) process.exit(1);

// ── 6: PPTX ─────────────────────────────────────────────────────────
let pptxOut = null;
if (formats.includes('pptx')) {
  const python = resolvePython('import pptx, PIL, lxml');
  if (!python) {
    console.error('[FAIL] PPTX 需要 python-pptx / lxml / Pillow / PyYAML：请用 --python 指定，或设置 CLAWHIVE_PPTX_PYTHON。');
    record('pptx', false, 'no python runtime');
    process.exit(1);
  }
  pptxOut = exportFileName(project, 'pptx', exportStamp);
  fs.mkdirSync(path.dirname(pptxOut), { recursive: true });
  if (!runNode('pptx-export.mjs', ['--python', python, '--out', pptxOut], { label: 'pptx-export' })) process.exit(1);
  if (!fs.existsSync(pptxOut)) {
    console.error(`[FAIL] pptx-export 没有产出 ${pptxOut}`);
    record('pptx', false, 'missing output');
    process.exit(1);
  }
}

// ── 7: HTML ────────────────────────────────────────────────────────
let htmlOut = null;
if (formats.includes('html')) {
  const python = resolvePython('from lxml import etree; import PIL');
  if (!python) {
    console.error('[FAIL] HTML 需要 lxml / Pillow 来内联底图：请用 --python 指定。');
    record('html', false, 'no python runtime');
    process.exit(1);
  }
  if (!runPython('finalize_svg.py', python, [], { label: 'finalize-svg' })) process.exit(1);
  htmlOut = exportFileName(project, 'html', exportStamp);
  if (!runNode('svg-deck-to-html.mjs', ['--out', htmlOut], { label: 'html-export' })) process.exit(1);
}

// ── 8: report ───────────────────────────────────────────────────────
const failed = steps.filter((s) => !s.ok);
console.log('\n[build-deck] summary');
for (const step of steps) console.log(`  ${step.ok ? 'ok  ' : 'FAIL'} ${step.name}`);
console.log(`  project: ${project}`);
if (pptxOut) console.log(`  pptx:    ${pptxOut}`);
if (htmlOut) console.log(`  html:    ${htmlOut}`);
process.exit(failed.length ? 1 : 0);
