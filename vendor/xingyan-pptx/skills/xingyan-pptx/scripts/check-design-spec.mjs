#!/usr/bin/env node
/**
 * Gate the story contract before any page is authored.
 *
 * Usage:
 *   node scripts/check-design-spec.mjs <project>
 *
 * Checks design_spec.md §I–§X, §IX per-page fields, page count agreement,
 * SVG page presence/order, and that a theme overlay never touched layout.
 */

import fs from 'node:fs';
import path from 'node:path';
import { SCOPES, LAYOUT_FIELD_LABELS, isLayoutScope } from './lib/theme-scopes.mjs';
import { outlineSha, readMarker, storySignature, specStorySignature } from './lib/outline.mjs';

const REQUIRED_SECTIONS = [
  '## I. ',
  '## II. ',
  '## III. ',
  '## IV. ',
  '## V. ',
  '## VI. ',
  '## VII. ',
  '## VIII. ',
  '## IX. ',
  '## X. ',
];

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

function readPageCount(spec) {
  const table = spec.match(/^\|\s*Page Count\s*\|\s*(\d+)\s*\|/m);
  if (table) return Number(table[1]);
  const bullet = spec.match(/^-\s*\*\*Page [Cc]ount\*\*:\s*(\d+)/m);
  if (bullet) return Number(bullet[1]);
  return null;
}

function slides(spec) {
  const re = /^####\s+Slide\s+(\d+)\s*(?:[-—:]\s*)?(.*)$/gm;
  const found = [];
  let match;
  while ((match = re.exec(spec))) {
    const start = match.index;
    const nextMatch = /^####\s+/gm;
    nextMatch.lastIndex = start + match[0].length;
    const next = nextMatch.exec(spec);
    const body = spec.slice(start + match[0].length, next ? next.index : spec.length);
    found.push({ number: Number(match[1]), name: match[2].trim(), body });
  }
  return found;
}

function pageFiles(project) {
  const dir = path.join(project, 'svg_output');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.toLowerCase().endsWith('.svg'))
    .map((name) => {
      const match = name.match(/(\d+)/);
      return { name, number: match ? Number(match[1]) : null };
    })
    .sort((a, b) => (a.number ?? 999) - (b.number ?? 999));
}

const args = parseArgs(process.argv.slice(2));
const project = path.resolve(args._[0] || '');
if (!project) {
  console.error('Usage: check-design-spec.mjs <project>');
  process.exit(2);
}

const errors = [];
const warnings = [];
const specPath = path.join(project, 'design_spec.md');
const lockPath = path.join(project, 'spec_lock.md');

if (!fs.existsSync(specPath)) {
  console.error('[BLOCK] design_spec.md not found');
  process.exit(1);
}
const spec = fs.readFileSync(specPath, 'utf8');

if (!fs.existsSync(lockPath)) errors.push('spec_lock.md not found');
for (const heading of REQUIRED_SECTIONS) {
  if (!spec.includes(heading)) errors.push(`missing section: ${heading.trim()}`);
}

// Scaffold placeholders mean the contract is still a skeleton, not a plan.
const placeholders = ['[fill', '{{'].filter((marker) => spec.includes(marker));
if (placeholders.length) {
  errors.push(`design_spec.md still has scaffold placeholders: ${placeholders.join(', ')}`);
}

const pageCount = readPageCount(spec);
if (!pageCount) errors.push('§I has no Page Count');

const list = slides(spec);
if (!list.length) {
  errors.push('§IX has no "#### Slide NN" blocks');
} else {
  if (pageCount && list.length !== pageCount) {
    errors.push(`§IX has ${list.length} slides but §I says ${pageCount}`);
  }
  const expected = Array.from({ length: list.length }, (_, i) => i + 1);
  const actual = list.map((slide) => slide.number);
  if (actual.join(',') !== expected.join(',')) {
    errors.push(`§IX slide numbers are not consecutive from 01: ${actual.join(', ')}`);
  }
  for (const slide of list) {
    const label = `Slide ${String(slide.number).padStart(2, '0')}`;
    for (const field of ['Audience move', 'Title', 'Core message', 'Content']) {
      if (!new RegExp(`^-\\s*\\*\\*${field}\\*\\*:`, 'm').test(slide.body)) {
        errors.push(`${label} missing "${field}"`);
      }
    }
    for (const field of ['Relationships', 'Composition']) {
      if (!new RegExp(`^-\\s*\\*\\*${field}\\*\\*:`, 'm').test(slide.body)) {
        warnings.push(`${label} missing "${field}" (the engine expects it)`);
      }
    }
  }
}

// §I and §X both state whether speaker notes are part of the deliverable.
const notesRow = spec.match(/^\|\s*Speaker Notes\s*\|\s*(enabled|disabled)/mi);
const notesGeneration = spec.match(/^-\s*\*\*Generation\*\*:\s*(enabled|disabled)/mi);
if (notesRow && notesGeneration && notesRow[1].toLowerCase() !== notesGeneration[1].toLowerCase()) {
  warnings.push(`§I Speaker Notes is ${notesRow[1]} but §X Generation is ${notesGeneration[1]}; keep them consistent`);
}

const pages = pageFiles(project);
if (pages.length) {
  const expectedCount = pageCount || list.length;
  if (pages.length !== expectedCount) {
    errors.push(`svg_output has ${pages.length} pages but the contract says ${expectedCount}`);
  }
  const numbers = pages.map((page) => page.number);
  const expected = Array.from({ length: pages.length }, (_, i) => i + 1);
  if (numbers.join(',') !== expected.join(',')) {
    errors.push(`svg_output page numbers do not match 1..${pages.length}: ${numbers.join(', ')}`);
  }
  const known = new Set(numbers);
  for (const page of pages) {
    if (!known.has(page.number)) warnings.push(`unrecognized page filename: ${page.name}`);
  }
}

// §IX is a projection of outline.json, never a place the agent rewrites.
const outlinePath = path.join(project, 'outline.json');
if (fs.existsSync(outlinePath)) {
  let outline = null;
  try {
    outline = JSON.parse(fs.readFileSync(outlinePath, 'utf8'));
  } catch (error) {
    errors.push(`outline.json is not valid JSON: ${error.message}`);
  }

  if (outline) {
    const marker = readMarker(spec);
    if (!marker) {
      errors.push('design_spec.md §IX has no outline marker. Run: node scripts/outline-to-spec.mjs <project>');
    } else {
      if (marker.revision !== (outline.revision ?? 0)) {
        errors.push(`§IX was projected from outline revision ${marker.revision}, outline is now revision ${outline.revision}. Re-run outline-to-spec.mjs.`);
      }
      if (marker.sha !== outlineSha(outline)) {
        errors.push('outline.json changed since §IX was projected (sha mismatch). Re-run outline-to-spec.mjs.');
      }
      const expected = JSON.stringify(storySignature(outline));
      const actual = JSON.stringify(specStorySignature(spec));
      if (expected !== actual) {
        errors.push('§IX page titles, messages or content do not match outline.json. §IX is projected, not authored: re-run outline-to-spec.mjs.');
      }
    }

    const outlineCount = Array.isArray(outline.slides) ? outline.slides.length : 0;
    if (pageCount && outlineCount !== pageCount) {
      errors.push(`outline.json has ${outlineCount} slides but §I Page Count is ${pageCount}`);
    }
    if (outline.status !== 'confirmed') {
      if (pages.length) {
        errors.push(`outline.json status=${outline.status}; confirm the outline before authoring pages`);
      } else {
        warnings.push(`outline.json status=${outline.status}; §IX is still a draft`);
      }
    }
  }
}

const overlayPath = path.join(project, 'theme_overlay.json');
if (fs.existsSync(overlayPath)) {
  try {
    const overlay = JSON.parse(fs.readFileSync(overlayPath, 'utf8'));
    if (!SCOPES.includes(overlay.scope)) {
      errors.push(`theme_overlay.json has unknown scope: ${overlay.scope}`);
    } else {
      const declared = Array.isArray(overlay.layoutFieldsTouched) ? overlay.layoutFieldsTouched : [];
      const legacy = (overlay.applied || []).filter((item) => LAYOUT_FIELD_LABELS.includes(item));
      const touched = declared.length ? declared : legacy;
      if (touched.length && !isLayoutScope(overlay.scope)) {
        errors.push(`theme overlay scope=${overlay.scope} touched layout field(s): ${touched.join(', ')}`);
      }
      if (overlay.layout && overlay.layout.changed && !isLayoutScope(overlay.scope)) {
        errors.push(`theme overlay scope=${overlay.scope} changed §V layout lines (spacing / composition / continuity)`);
      }
    }
    const forbidden = ['coverStructure', 'sectionStructure', 'titleTreatment', 'decorativeLanguage', 'bodyCompositionBias'];
    for (const item of overlay.applied || []) {
      if (forbidden.some((key) => String(item).includes(key))) {
        errors.push(`theme overlay touched a layout field: ${item}`);
      }
    }
  } catch (error) {
    errors.push(`theme_overlay.json is not valid JSON: ${error.message}`);
  }
}

for (const warning of warnings) console.warn(`[WARN] ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`[BLOCK] ${error}`);
  console.error(`\n[FAIL] ${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(1);
}
console.log(`[OK] design contract valid: ${list.length} slides, ${pages.length || 0} pages authored, ${warnings.length} warning(s)`);
