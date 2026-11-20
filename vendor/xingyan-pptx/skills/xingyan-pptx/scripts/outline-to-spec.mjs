#!/usr/bin/env node
/**
 * Project a confirmed outline into the engine design contract.
 *
 * Usage:
 *   node scripts/outline-to-spec.mjs <project> [--check] [--force]
 *
 * This is the only writer of `design_spec.md` §IX. The agent writes §II–§VIII
 * and §X around it; it never retypes the user's titles, order or content.
 *
 *   --check   compare without writing; exits 1 on drift
 *   --force   allow projecting an outline that is still a draft
 *
 * The projection is deterministic: same outline in, byte-identical §IX out.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  projectIX,
  markerLine,
  setSpecRow,
  storySignature,
  specStorySignature,
  renderCommunicationLock,
  renderRhythmLock,
  setLockBlock,
  defaultReadingMode,
  normalizeLanguage,
} from './lib/outline.mjs';
import { sceneDefaults } from './lib/scenes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SPEC_HEADING = '## IX. Content Outline';

const CANVAS = {
  ppt169: { name: 'PPT 16:9', dims: '1280×720', viewBox: '0 0 1280 720' },
  ppt43: { name: 'PPT 4:3', dims: '1024×768', viewBox: '0 0 1024 768' },
};

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

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

/**
 * The bundled engine tree. A host layout may ship it elsewhere; resolve
 * whichever is present, preferring runtime/engine.
 */
function engineRoot() {
  const candidates = [path.join(ROOT, 'runtime', 'engine')];
  const found = candidates.find((dir) => fs.existsSync(path.join(dir, 'templates', 'scaffolds', 'design_spec.md')));
  if (!found) fail('Engine not found (expected runtime/engine).');
  return found;
}

/** Structural page language owned by the selected theme, when one is set. */
function themeProseFor(outline) {
  const themeId = outline.contract?.themeId;
  if (!themeId) return null;
  const file = path.join(ROOT, 'themes', 'tokens', `${themeId}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const token = JSON.parse(read(file));
    return {
      tocStructure: token.tocStructure,
      heroStructure: token.heroStructure,
    };
  } catch {
    return null;
  }
}

function substitute(text, outline, canvas, projectName) {
  return text
    .replaceAll('{{PROJECT_NAME}}', projectName)
    .replaceAll('{{CANVAS_NAME}}', canvas.name)
    .replaceAll('{{CANVAS_DIMENSIONS}}', canvas.dims)
    .replaceAll('{{VIEWBOX}}', canvas.viewBox)
    .replaceAll('{{CREATED_DATE}}', new Date().toISOString().slice(0, 10));
}

function ensureSection(text, heading, beforeHeading, body) {
  if (text.split('\n').some((line) => line.trim() === heading)) return text;
  return text.replace(beforeHeading, `${heading}\n\n${body}\n\n${beforeHeading}`);
}

function ensureLine(text, label, line, afterLabel) {
  if (text.includes(`**${label}**`)) return text;
  const re = new RegExp(`^(- \\*\\*${afterLabel}\\*\\*:.*)$`, 'm');
  return re.test(text) ? text.replace(re, `$1\n${line}`) : text;
}

const args = parseArgs(process.argv.slice(2));
const project = path.resolve(args._[0] || '');
if (!project) {
  console.error('Usage: outline-to-spec.mjs <project> [--check] [--force]');
  process.exit(2);
}

const outlinePath = path.join(project, 'outline.json');
if (!fs.existsSync(outlinePath)) {
  fail('outline.json not found. The outline comes before the design contract.');
}
const outline = JSON.parse(read(outlinePath));
if (outline.status !== 'confirmed' && !args.force) {
  fail(`outline.json status=${outline.status}. Confirm the outline first, or pass --force to preview.`);
}
if (!Array.isArray(outline.slides) || !outline.slides.length) {
  fail('outline.json has no slides.');
}

const canvas = CANVAS[outline.contract?.canvas] || CANVAS.ppt169;
const projectName = outline.contract?.projectName || path.basename(project);

// --- design_spec.md -------------------------------------------------------

const specPath = path.join(project, 'design_spec.md');
const createdSpec = !fs.existsSync(specPath);
let spec = createdSpec
  ? substitute(read(path.join(engineRoot(), 'templates', 'scaffolds', 'design_spec.md')), outline, canvas, projectName)
  : read(specPath);

// The vendored scaffold is missing §VII and has no Spacing anchors line, both
// of which the rest of this package expects. Repair only the copy we create.
if (createdSpec) {
  spec = ensureSection(
    spec,
    '## VII. Visualization Reference List',
    '## VIII. Image Resource List',
    '| Page | Family | Template | Usage |\n| --- | --- | --- | --- |',
  );
  spec = ensureLine(spec, 'Spacing anchors', '- **Spacing anchors**: [fill]', 'Spacing posture');
}

const contract = outline.contract || {};
// An explicit value always wins. When it is missing, the scene preset fills
// the default; mode stays a recommendation the agent may override.
const sceneInfo = sceneDefaults(contract.scene);
const workMode = contract.workMode || 'create';
const readingMode = contract.readingMode || sceneInfo?.readingMode || defaultReadingMode(contract.scene);
const mode = workMode === 'beautify' ? 'briefing' : (contract.mode || sceneInfo?.mode || '');
const language = normalizeLanguage(contract.primaryLanguage) || contract.primaryLanguage;
const audience = contract.audience || sceneInfo?.audience || '';
const communicationIntent = contract.communicationIntent || sceneInfo?.intent || '';
const audienceOutcome = contract.audienceOutcome || sceneInfo?.outcome || '';
const deliveryContext = contract.deliveryContext || sceneInfo?.delivery || '';
const artifactAfterlife = contract.artifactAfterlife || sceneInfo?.afterlife || '';
const speakerNotes = contract.speakerNotes || 'enabled';
// The lock and §I must agree. Build one effective contract from the explicit
// values plus the scene defaults; never write it back to outline.json.
const effectiveOutline = {
  ...outline,
  contract: {
    ...contract,
    audience,
    communicationIntent,
    audienceOutcome,
    deliveryContext,
    artifactAfterlife,
    primaryLanguage: language,
    readingMode,
    mode,
    speakerNotes,
  },
};
const rows = {
  'Project Name': contract.projectName,
  'Canvas Format': `${canvas.name} (${canvas.dims})`,
  'Page Count': String(outline.slides.length),
  'Target Audience': audience,
  'Communication Intent': communicationIntent,
  'Desired Audience Outcome': audienceOutcome,
  'Core Message / Ask / Action': contract.coreMessage,
  'Delivery Context': deliveryContext,
  'Artifact Afterlife': artifactAfterlife,
  'Reading Mode': readingMode,
  'Content Strategy': [
    `工作方式 ${contract.workMode || 'create'}`,
    mode && `叙事骨架 ${mode}${contract.mode ? '' : workMode === 'beautify' ? '（保真默认）' : '（场景默认）'}`,
    contract.pageBudget && `页数预算 ${contract.pageBudget}`,
    `材料偏离度 ${contract.contentDivergence || 'balanced'}`,
  ].filter(Boolean).join('；'),
  'Design Style': contract.themeId ? `主题 ${contract.themeId}（视觉覆盖，见 theme_overlay.json）` : '',
  'Generation Mode': 'continuous',
  'Spec Refinement': 'off',
  'Speaker Notes': `${speakerNotes} (contract default)`,
  'Custom Animations': 'disabled (default)',
  'Narration Audio': 'disabled (default)',
  'Created Date': new Date().toISOString().slice(0, 10),
};
for (const [label, value] of Object.entries(rows)) {
  if (value) spec = setSpecRow(spec, label, value);
}

const themeProse = themeProseFor(outline);
const projected = projectIX(spec, outline, themeProse);
if (!projected) fail(`design_spec.md has no "${SPEC_HEADING}" heading. Use a engine-format design spec.`);

if (args.check) {
  // Compare only the user-owned fields. Derived lines (Relationships,
  // Composition, Visualization) may be added after projection without drift.
  const expected = JSON.stringify(storySignature(outline));
  const actual = JSON.stringify(specStorySignature(spec));
  if (expected !== actual) {
    console.error('[FAIL] design_spec.md §IX does not match outline.json');
    console.error('       Re-run without --check to project the confirmed outline.');
    process.exit(1);
  }
  console.log(`[OK] §IX matches outline rev ${outline.revision} (${outline.slides.length} slides)`);
  process.exit(0);
}

fs.writeFileSync(specPath, projected, 'utf8');

// --- spec_lock.md ---------------------------------------------------------

const lockPath = path.join(project, 'spec_lock.md');
const createdLock = !fs.existsSync(lockPath);
let lock = createdLock
  ? substitute(read(path.join(engineRoot(), 'templates', 'scaffolds', 'spec_lock.md')), outline, canvas, projectName)
  : read(lockPath);

lock = setLockBlock(lock, '## communication', renderCommunicationLock(effectiveOutline));
lock = setLockBlock(lock, '## page_rhythm', renderRhythmLock(outline));
if (mode) lock = setLockBlock(lock, '## mode', `## mode\n- mode: ${mode}`);
fs.writeFileSync(lockPath, lock, 'utf8');

console.log(`[OK] outline rev ${outline.revision} -> ${outline.slides.length} slides`);
console.log(`  - ${markerLine(outline)}`);
console.log(`  - design_spec.md §IX${createdSpec ? ' (created from scaffold)' : ''}`);
console.log(`  - spec_lock.md communication + page_rhythm${createdLock ? ' (created from scaffold)' : ''}`);
console.log('Next: write §II–§VIII and §X, then run check-design-spec.mjs');
