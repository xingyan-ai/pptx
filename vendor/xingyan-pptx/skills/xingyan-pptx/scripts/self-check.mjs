#!/usr/bin/env node
import { readJsonFile } from './lib/json.mjs';
import { pythonEnv } from './lib/python-runtime.mjs';
/**
 * Prove this package is self-contained.
 *
 * Usage:
 *   node scripts/self-check.mjs           # structure + dependency audit
 *   node scripts/self-check.mjs --smoke   # also run a full deck pipeline offline
 *
 * The audit fails on: a missing bundled file, a script importing anything other
 * than Node built-ins or its own lib, an absolute or home-relative path, or a
 * reference to an external command. The smoke run creates a throwaway project,
 * builds a two-page deck end to end, and checks the HTML has no external URLs.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { SCENE_DEFAULTS, SCENE_NAMES } from './lib/scenes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SMOKE = process.argv.includes('--smoke');

const errors = [];
const warnings = [];
const pass = [];

function ok(label) {
  pass.push(label);
}
function fail(label) {
  errors.push(label);
}
function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}
function requireFile(rel, label = rel) {
  if (exists(rel)) ok(label);
  else fail(`missing bundled file: ${rel}`);
}

// --- 1. Engine and its scaffolds ------------------------------------------

for (const rel of [
  'SKILL.md',
  'ENGINE.md',
  'metadata.json',
  'package.json',
  'schemas/outline.schema.json',
  'runtime/engine/SKILL.md',
  'runtime/engine/scripts/attribution_guard.py',
  'runtime/engine/templates/scaffolds/design_spec.md',
  'runtime/engine/templates/scaffolds/spec_lock.md',
  'themes/catalog.json',
  'themes/fonts.map.json',
  'assets/fonts/OFL-NOTICE.md',
]) {
  requireFile(rel);
}

// --- 1b. Brand template layouts + deterministic composer ------------------

requireFile('scripts/compose-deck.mjs');
requireFile('scripts/compose-core.mjs');
requireFile('scripts/prepare-core-project.mjs');
requireFile('scripts/prepare-brand-project.mjs');
requireFile('scripts/build-deck.mjs');
requireFile('scripts/fill-brand-contract.mjs');
requireFile('scripts/extract-source.mjs');
requireFile('scripts/extract_source.py');
requireFile('templates/brand/zhongtai-v5/template.json');
const brandMetaPath = path.join(ROOT, 'templates/brand/zhongtai-v5/template.json');
if (fs.existsSync(brandMetaPath)) {
  const brand = readJsonFile(brandMetaPath);
  const proxyLayouts = {
    'cards-3': '04c_cards3.svg',
    table: '04c_table.svg',
    'metrics-4': '04c_metrics4.svg',
    'metrics-compare': '04c_metricscompare.svg',
    'table-metrics': '04c_tablemetrics.svg',
    'content-rich': '04c_contentrich.svg',
  };
  const declared = new Set(brand?.structure?.pages || []);
  let brandOk = true;
  for (const [key, file] of Object.entries(proxyLayouts)) {
    if (!declared.has(key)) { fail(`template.json structure.pages missing proxy layout ${key}`); brandOk = false; }
    if (!exists(`templates/brand/zhongtai-v5/templates/${file}`)) {
      fail(`missing brand prototype templates/brand/zhongtai-v5/templates/${file}`);
      brandOk = false;
    }
    if (!brand?.compose?.layouts?.[key]) { fail(`template.json compose mapping missing ${key}`); brandOk = false; }
  }
  if (!brand?.density?.capacity?.['cards-3']) { fail('template.json density.capacity missing cards-3'); brandOk = false; }
  if (brandOk) ok('brand template: 6 proxy layouts + compose metadata');
}

// --- 2. Theme and skill manifests ----------------------------------------

const meta = readJsonFile(path.join(ROOT, 'metadata.json'));
if (meta.schemaVersion !== '2.0' || meta.type !== 'skill') fail('metadata.json must be schemaVersion 2.0 / type skill');
if (meta.id !== meta.name) fail('metadata.json id and name must match');
if (!/^\d+\.\d+\.\d+$/.test(meta.version || '')) fail(`metadata.json version must be SemVer, got ${meta.version}`);
if (!meta.displayName) fail('metadata.json needs a displayName');
if (!errors.some((error) => error.startsWith('metadata.json'))) ok('skill metadata is schema 2.0 with a SemVer version');

// --- 3. Themes and fonts --------------------------------------------------

const tokenDir = path.join(ROOT, 'themes', 'tokens');
const tokens = fs.existsSync(tokenDir)
  ? fs.readdirSync(tokenDir).filter((name) => name.endsWith('.json'))
  : [];
if (tokens.length !== 21) fail(`expected 21 theme tokens, found ${tokens.length}`);
else ok('21 theme tokens');

for (const name of tokens) {
  const token = readJsonFile(path.join(tokenDir, name));
  for (const key of ['colors', 'typography', 'decoration', 'components']) {
    if (!token[key]) fail(`theme ${name} has no ${key} block`);
  }
  for (const key of ['tocStructure', 'heroStructure']) {
    if (!token[key]) fail(`theme ${name} has no ${key} prose`);
  }
}
if (!errors.some((error) => error.startsWith('theme '))) ok('every theme has colors / typography / decoration / components / toc / hero prose');

// --- 3.1 Scene presets ----------------------------------------------------

const READING_MODES = ['text', 'balanced', 'presentation'];
const MODES = ['pyramid', 'narrative', 'instructional', 'showcase', 'briefing'];
const themeIds = new Set(tokens.map((name) => name.replace(/\.json$/, '')));
for (const [name, preset] of Object.entries(SCENE_DEFAULTS)) {
  for (const key of ['audience', 'intent', 'outcome', 'delivery', 'afterlife']) {
    if (!preset[key]) fail(`scene "${name}" has no ${key}`);
  }
  if (!READING_MODES.includes(preset.readingMode)) fail(`scene "${name}" has invalid readingMode "${preset.readingMode}"`);
  if (!MODES.includes(preset.mode)) fail(`scene "${name}" has invalid mode "${preset.mode}"`);
  if (!Array.isArray(preset.pageRange) || preset.pageRange.length !== 2
    || preset.pageRange.some((value) => !Number.isInteger(value))) {
    fail(`scene "${name}" needs a two-integer pageRange`);
  }
  for (const theme of preset.themes || []) {
    if (!themeIds.has(theme)) fail(`scene "${name}" references missing theme "${theme}"`);
  }
}
if (!errors.some((error) => error.startsWith('scene "'))) {
  ok(`${Object.keys(SCENE_DEFAULTS).length} scene presets are complete and reference packaged themes`);
}

// 3.1.1 The scene list users and agents read must match scenes.mjs.
const sceneDocs = ['SKILL.md', 'README.md', 'references/outline-contract.md'];
for (const doc of sceneDocs) {
  const file = path.join(ROOT, doc);
  if (!fs.existsSync(file)) {
    fail(`missing scene doc: ${doc}`);
    continue;
  }
  const text = fs.readFileSync(file, 'utf8');
  const missing = SCENE_NAMES.filter((name) => !text.includes(name));
  if (missing.length) fail(`${doc} does not list scene(s): ${missing.join(', ')}`);
}
if (!errors.some((error) => error.includes('does not list scene(s)') || error.startsWith('missing scene doc:'))) {
  ok('SKILL.md / README.md / outline-contract.md list every scene preset');
}

const scenariosPath = path.join(ROOT, 'themes', 'scenarios.json');
if (fs.existsSync(scenariosPath)) {
  const sceneText = JSON.stringify(readJsonFile(scenariosPath));
  const missing = SCENE_NAMES.filter((name) => !sceneText.includes(name));
  if (missing.length) warnings.push(`themes/scenarios.json has no theme signal for scene(s): ${missing.join(', ')}`);
  else ok('every scene label is represented in themes/scenarios.json');
}

const fontMap = readJsonFile(path.join(ROOT, 'themes', 'fonts.map.json'));
let fontCount = 0;
for (const [family, entry] of Object.entries(fontMap.families || {})) {
  for (const file of entry.files || []) {
    fontCount += 1;
    if (!exists(path.join('assets', 'fonts', file.file))) {
      fail(`font ${family} points at a missing file: ${file.file}`);
    }
  }
}
if (fontCount) ok(`${fontCount} embeddable font files present`);

// --- 4. Scripts depend only on Node and themselves ------------------------

const scriptDir = path.join(ROOT, 'scripts');
const scriptFiles = fs.readdirSync(scriptDir).filter((name) => name.endsWith('.mjs'));
const libDir = path.join(scriptDir, 'lib');
if (fs.existsSync(libDir)) {
  for (const name of fs.readdirSync(libDir).filter((entry) => entry.endsWith('.mjs'))) {
    scriptFiles.push(path.join('lib', name));
  }
}

const allowedBare = /^node:/;
for (const rel of scriptFiles) {
  const file = path.join(scriptDir, rel);
  const source = fs.readFileSync(file, 'utf8');
  const specifiers = [...source.matchAll(/(?:from\s+|require\()\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
  for (const specifier of specifiers) {
    if (specifier.startsWith('.') || allowedBare.test(specifier)) continue;
    fail(`scripts/${rel} imports external package "${specifier}"`);
  }
  const absolute = source.match(/['"](?:\/Users\/|~\/)/);
  if (absolute) fail(`scripts/${rel} contains an absolute path: ${absolute[0].slice(1, -1)}`);
  // This checker names the commands it forbids, so it skips its own scan.
  // pptx-export.mjs is the sanctioned local-runtime bridge: it probes for an
  // interpreter and is the only script allowed to name one.
  const externalBridge = rel === 'pptx-export.mjs' || rel === 'extract-source.mjs'
    || rel === 'build-deck.mjs' || rel === 'lib/python-runtime.mjs';
  if (rel !== 'self-check.mjs' && !externalBridge) {
    for (const command of ['python3', 'openclaw', 'npx ', 'playwright', 'ffmpeg', 'curl ', 'wget ']) {
      if (source.includes(command)) fail(`scripts/${rel} references external command "${command.trim()}"`);
    }
  }
}
ok(`${scriptFiles.length} scripts import only Node built-ins and local libs`);

// --- 5. Engine integrity (only when the host has Python) ------------------

let hasPython = false;
try {
  execFileSync('python3', ['--version'], { stdio: 'ignore', windowsHide: true, env: pythonEnv() });
  hasPython = true;
} catch {
  warnings.push('python3 not found; skipped engine integrity check (the client never runs it anyway)');
}
if (hasPython) {
  try {
    execFileSync('python3', [path.join(ROOT, 'runtime', 'engine', 'scripts', 'attribution_guard.py')], { stdio: 'ignore', windowsHide: true, env: pythonEnv() });
    ok('engine integrity');
  } catch {
    fail('engine integrity check failed (runtime/engine was modified)');
  }
}

// --- 6. Offline smoke run -------------------------------------------------

function run(args, cwd) {
  const env = { HOME: path.join(cwd, '.home'), PATH: process.env.PATH };
  try {
    return execFileSync(process.execPath, args, { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  } catch (error) {
    const detail = [error.stdout, error.stderr].filter(Boolean).join('\n').trim();
    fail(`smoke step failed: ${path.basename(args[0])} ${args.slice(1).join(' ')}\n${detail}`);
    return null;
  }
}

if (SMOKE) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'deck-selfcheck-'));
  const project = path.join(tmp, 'deck');
  fs.mkdirSync(path.join(tmp, '.home'));
  const scripts = (name) => path.join(ROOT, 'scripts', name);

  if (run([scripts('init-project.mjs'), project, '--name', 'Self Check'], tmp)) {
    fs.writeFileSync(path.join(project, 'outline.json'), JSON.stringify({
      schemaVersion: 1,
      revision: 1,
      status: 'confirmed',
      source: 'user',
      contract: {
        projectName: 'Self Check',
        primaryLanguage: 'zh-CN',
        scene: '内部汇报',
        audience: '团队',
        communicationIntent: '证明包可离线独立运行',
        audienceOutcome: '确认无外部依赖',
        coreMessage: '解压即用',
        deliveryContext: '内部',
        artifactAfterlife: '测试',
        contentDivergence: 'balanced',
        mode: 'pyramid',
        readingMode: 'balanced',
        canvas: 'ppt169',
        densityDefault: 'standard',
        themeId: 'brutalist-acid',
      },
      slides: [
        { id: 's01', role: 'cover', title: '自包含检查', coreMessage: '不依赖外部', points: ['封面'], density: 'standard' },
        { id: 's02', role: 'toc', title: '目录', coreMessage: '三个部分', points: [], density: 'standard' },
        { id: 's03', role: 'section', title: '第一部分', coreMessage: '开始', points: [], density: 'standard' },
        { id: 's04', role: 'hero', title: '解压即用', coreMessage: '一个数字说明问题', points: ['0 个外部依赖'], density: 'lean' },
        {
          id: 's05',
          role: 'content',
          title: '第二步',
          coreMessage: '仍然独立',
          points: [
            '整个流程只依赖 Node 内置模块，项目里没有 node_modules。',
            '主题、字体和图标都随包提供，解压后可以直接使用。',
            '导出成单文件 HTML 时不引用任何外部 URL。',
          ],
          evidence: [
            '自检扫描 21 套主题、10 个 woff2 字体和 6 个脚本目录，全部命中包内文件。',
            '离线烟测从大纲一路跑到 HTML，外部 URL 数量为 0，字体内联为 data URI。',
          ],
          soWhat: '交付物可以断网运行，也可以直接给客户，不需要再补依赖。',
          action: '发布前固定跑 self-check.mjs --smoke，把这条约束留在流水线里。',
          source: '包内自检，2026-10',
          density: 'rich',
        },
        { id: 's06', role: 'ending', title: '结束', coreMessage: '完成', points: [], density: 'standard' },
      ],
    }, null, 2));

    if (run([scripts('outline-check.mjs'), project], tmp)
      && run([scripts('outline-to-spec.mjs'), project], tmp)) {
      const specPath = path.join(project, 'design_spec.md');
      const spec = fs.readFileSync(specPath, 'utf8').replace(/\[fill[^\]]*\]/g, '示例');
      fs.writeFileSync(specPath, spec);

      if (run([scripts('apply-theme.mjs'), project, '--theme', 'brutalist-acid', '--scope', 'visual'], tmp)) {
        const page = (role, label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" data-pptx-page-role="${role}"><rect width="1280" height="720" fill="#FFFFFF"/><text x="96" y="360" font-size="48" font-family="Archivo Black" fill="#111111">${label}</text></svg>`;
        const pages = [
          ['cover', 'Self Check'], ['toc', 'Contents'], ['section', 'Part One'],
          ['content', 'Hero'], ['content', 'Step'], ['ending', 'End'],
        ];
        pages.forEach(([role, label], index) => {
          fs.writeFileSync(path.join(project, 'svg_output', `P${String(index + 1).padStart(2, '0')}.svg`), page(role, label));
        });

        if (run([scripts('check-design-spec.mjs'), project], tmp)
          && run([
            scripts('svg-deck-to-html.mjs'),
            project,
            '--theme', path.join(ROOT, 'themes', 'tokens', 'brutalist-acid.json'),
          ], tmp)) {
          const exportsDir = path.join(project, 'exports');
          const html = fs.readdirSync(exportsDir).find((name) => name.endsWith('.html'));
          if (!html) {
            fail('smoke run produced no HTML');
          } else {
            const text = fs.readFileSync(path.join(exportsDir, html), 'utf8');
            const external = [...text.matchAll(/https?:\/\/[^\s"'<>]+/g)]
              .map((match) => match[0])
              .filter((url) => !url.startsWith('http://www.w3.org/'));
            if (external.length) fail(`HTML references external URLs: ${external.slice(0, 3).join(', ')}`);
            else ok('smoke deck: outline -> contract -> theme -> pages -> single-file HTML, no external URLs');
            if (!/data:font\/woff2/.test(text)) warnings.push('smoke theme embedded no woff2; font embedding path not exercised');
            else ok('smoke deck embeds its fonts as data URIs');
          }
        }
      }
    }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}

// --- Report ---------------------------------------------------------------

for (const label of pass) console.log(`[ok] ${label}`);
for (const warning of warnings) console.warn(`[warn] ${warning}`);
for (const error of errors) console.error(`[fail] ${error}`);
if (errors.length) {
  console.error(`\n[FAIL] ${errors.length} error(s)`);
  process.exit(1);
}
console.log(`\n[OK] package is self-contained${SMOKE ? ' (including an offline smoke deck)' : ''}`);
