#!/usr/bin/env node
/**
 * Validate an outline before it is confirmed or projected.
 *
 * Usage:
 *   node scripts/outline-check.mjs <project> [--json]
 *
 * An outline is the user-edited story: page order, page titles, each page's
 * core message, claims, evidence and action. This gate proves the outline is
 * complete and deep enough to project a readable page, not that the argument
 * is right.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROLES,
  DENSITIES,
  STATUSES,
  READING_MODES,
  rhythmFor,
  defaultReadingMode,
  normalizeLanguage,
  contentStats,
  findPlaceholders,
} from './lib/outline.mjs';
import { sceneDefaults } from './lib/scenes.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

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
if (!project) {
  console.error('Usage: outline-check.mjs <project> [--json]');
  process.exit(2);
}

const outlinePath = path.join(project, 'outline.json');
if (!fs.existsSync(outlinePath)) {
  console.error('[BLOCK] outline.json not found. Write the outline before the design contract.');
  process.exit(1);
}

let outline;
try {
  outline = JSON.parse(fs.readFileSync(outlinePath, 'utf8'));
} catch (error) {
  console.error(`[BLOCK] outline.json is not valid JSON: ${error.message}`);
  process.exit(1);
}

const errors = [];
const warnings = [];
const confirmed = outline.status === 'confirmed';
const PAGE_BUDGETS = {
  compact: [5, 8],
  standard: [9, 15],
  detailed: [16, 24],
};

if (outline.schemaVersion !== 1) {
  errors.push(`outline.schemaVersion must be 1, got ${outline.schemaVersion}`);
}
if (!STATUSES.includes(outline.status)) {
  errors.push(`outline.status must be draft or confirmed, got ${JSON.stringify(outline.status)}`);
}
if (!Number.isInteger(outline.revision) || outline.revision < 1) {
  errors.push('outline.revision must be a positive integer');
}

const contract = outline.contract || {};
const sceneInfo = sceneDefaults(contract.scene);
if (contract.scene && !sceneInfo) {
  warnings.push(`contract.scene "${contract.scene}" is not one of the packaged scene presets; using keyword defaults`);
}
const language = contract.primaryLanguage;
const normalizedLanguage = normalizeLanguage(language);
if (!language) {
  errors.push('contract.primaryLanguage is required');
} else if (!normalizedLanguage) {
  errors.push(`contract.primaryLanguage must be a BCP-47 tag (got "${language}"; use "zh-CN" / "en-US", not a UI label)`);
} else if (normalizedLanguage !== language) {
  warnings.push(`contract.primaryLanguage "${language}" will be normalized to "${normalizedLanguage}" when projected`);
}
const workMode = contract.workMode || 'create';
if (!['create', 'beautify', 'edit'].includes(workMode)) {
  errors.push(`contract.workMode must be create / beautify / edit, got ${JSON.stringify(contract.workMode)}`);
}
if (workMode !== 'beautify') {
  if (!contract.mode) {
    const suggested = sceneInfo?.mode || 'briefing';
    warnings.push(`contract.mode is empty; scene "${sceneInfo?.key || contract.scene || '未指定'}" suggests "${suggested}"`);
  } else if (sceneInfo && contract.mode !== sceneInfo.mode) {
    warnings.push(`scene "${sceneInfo.key}" suggests mode="${sceneInfo.mode}"${sceneInfo.modeNote ? ` (${sceneInfo.modeNote})` : ''}; current is "${contract.mode}". Confirm this is intentional.`);
  }
}
if (workMode === 'beautify') {
  if (contract.mode && contract.mode !== 'briefing') {
    errors.push('beautify keeps the source wording, so contract.mode must be "briefing"');
  }
  if (!contract.mode) warnings.push('beautify defaults mode to briefing');
  if (!Number.isInteger(contract.sourceSlideCount) || contract.sourceSlideCount < 1) {
    errors.push('beautify requires contract.sourceSlideCount (the source deck\'s slide count)');
  }
}
if (contract.speakerNotes && !['enabled', 'disabled'].includes(contract.speakerNotes)) {
  errors.push(`contract.speakerNotes must be enabled or disabled, got ${JSON.stringify(contract.speakerNotes)}`);
}
if (!contract.coreMessage) {
  warnings.push('contract.coreMessage is empty; fill the deck-level core message (a scene preset cannot supply it)');
}
if (sceneInfo) {
  const inherited = ['audience', 'communicationIntent', 'audienceOutcome', 'deliveryContext', 'artifactAfterlife']
    .filter((key) => !contract[key]);
  if (inherited.length) {
    warnings.push(`contract field(s) empty: ${inherited.join(', ')}; scene "${sceneInfo.key}" defaults will be used when projecting`);
  }
}
if (contract.themeId) {
  const tokenPath = path.join(ROOT, 'themes', 'tokens', `${contract.themeId}.json`);
  if (!fs.existsSync(tokenPath)) errors.push(`contract.themeId "${contract.themeId}" is not a packaged theme`);
}
const pageBudget = contract.pageBudget;
if (pageBudget && !PAGE_BUDGETS[pageBudget]) {
  errors.push(`contract.pageBudget must be compact / standard / detailed, got ${JSON.stringify(pageBudget)}`);
}

const readingMode = contract.readingMode;
const suggestedReadingMode = sceneInfo?.readingMode || defaultReadingMode(contract.scene);
if (readingMode && !READING_MODES.includes(readingMode)) {
  errors.push(`contract.readingMode must be one of ${READING_MODES.join(' / ')}, got ${JSON.stringify(readingMode)}`);
} else if (!readingMode) {
  warnings.push(`contract.readingMode is empty; scene "${sceneInfo?.key || contract.scene || '未指定'}" defaults to "${suggestedReadingMode}"`);
} else if (sceneInfo && readingMode !== sceneInfo.readingMode) {
  warnings.push(`scene "${sceneInfo.key}" suggests readingMode="${sceneInfo.readingMode}"${sceneInfo.readingModeNote ? ` (${sceneInfo.readingModeNote})` : ''}; current is "${readingMode}". Allowed when the delivery context differs.`);
}
const effectiveReadingMode = readingMode || suggestedReadingMode;

const slides = Array.isArray(outline.slides) ? outline.slides : [];
if (!slides.length) {
  errors.push('outline.slides is empty');
} else {
  if (slides.length < 3) warnings.push(`outline has ${slides.length} slides; decks shorter than 3 usually lack a story`);
  if (slides.length > 40) warnings.push(`outline has ${slides.length} slides; consider splitting the deck`);
  const pageRange = pageBudget ? PAGE_BUDGETS[pageBudget] : sceneInfo?.pageRange;
  if (pageRange && slides.length < pageRange[0]) {
    warnings.push(`outline has ${slides.length} slides; ${pageBudget ? `pageBudget="${pageBudget}"` : `scene "${sceneInfo.key}"`} suggests ${pageRange[0]}–${pageRange[1]}; page count stays the user's call`);
  }
  if (pageRange && slides.length > pageRange[1]) {
    warnings.push(`outline has ${slides.length} slides; ${pageBudget ? `pageBudget="${pageBudget}"` : `scene "${sceneInfo.key}"`} suggests ${pageRange[0]}–${pageRange[1]}; page count stays the user's call`);
  }

  const seen = new Set();
  let covers = 0;
  slides.forEach((slide, index) => {
    const label = `Slide ${String(index + 1).padStart(2, '0')} (${slide.id || 'no-id'})`;
    if (!slide.id) errors.push(`${label} has no id`);
    else if (!/^[a-z0-9][a-z0-9-]*$/.test(slide.id)) errors.push(`${label} id must be kebab-case`);
    else if (seen.has(slide.id)) errors.push(`${label} id is duplicated`);
    else seen.add(slide.id);

    if (!ROLES.includes(slide.role)) errors.push(`${label} role must be one of ${ROLES.join(' / ')}`);
    if (slide.role === 'cover') covers += 1;

    if (!slide.title || !String(slide.title).trim()) {
      errors.push(`${label} has no title`);
    }
    if (!slide.coreMessage || !String(slide.coreMessage).trim()) {
      (confirmed ? errors : warnings).push(`${label} has no coreMessage`);
    }

    const stats = contentStats(slide);
    if (slide.role === 'content' && confirmed && !stats.points.length) {
      errors.push(`${label} is a content page with no points`);
    }

    // Depth is a create-mode concern. Beautify must keep the source wording and
    // edit must leave unchanged pages alone, so those modes are exempt.
    if (workMode === 'create' && ['content', 'hero'].includes(slide.role)) {
      const placeholders = [...new Set(findPlaceholders(slide))];
      if (confirmed && placeholders.length) {
        errors.push(`${label} uses placeholder phrasing (${placeholders.join(', ')}); write the actual claim and evidence`);
      }
    }
    if (workMode === 'create' && slide.role === 'content' && slide.density !== 'lean') {
      if (confirmed && stats.chars < 80) {
        errors.push(`${label} carries ${stats.chars} characters; a content page needs at least 80 characters across points, evidence, so what and action`);
      } else if (stats.chars < 180) {
        warnings.push(`${label} carries ${stats.chars} characters; aim for 180+ so the page has a real argument`);
      }
      if (stats.points.length < 3) {
        warnings.push(`${label} has ${stats.points.length} point(s); a standard content page usually carries 3-6 claims`);
      }
      const quantitative = [...stats.points, ...stats.evidence].join('');
      if (/[0-9０-９%]/.test(quantitative) && !stats.source) {
        warnings.push(`${label} has quantitative claims but no source; add the source, date and measurement basis`);
      }
    }

    if (workMode === 'create' && slide.role === 'content') {
      const readingMode = contract.readingMode || 'balanced';
      if (slide.density === 'rich' && confirmed && stats.chars < 280) {
        warnings.push(`${label} is rich but carries ${stats.chars} characters; rich pages aim for 280+ so the page is not only components`);
      }
      if (readingMode === 'presentation' && stats.chars > 160) {
        warnings.push(`${label} carries ${stats.chars} characters under readingMode=presentation; keep presentation pages short or move detail to notes`);
      }
    }

    if (slide.density && !DENSITIES.includes(slide.density)) {
      errors.push(`${label} density must be one of ${DENSITIES.join(' / ')}`);
    }
    if (confirmed && slide.draftState === 'needs-draft') {
      errors.push(`${label} still needs a draft; fill it before confirming`);
    }
  });

  if (!covers) errors.push('outline has no cover page (role: cover)');
  if (covers > 1) warnings.push(`outline has ${covers} cover pages`);

  if (workMode === 'beautify' && Number.isInteger(contract.sourceSlideCount)
    && slides.length !== contract.sourceSlideCount) {
    errors.push(`beautify must keep one page per source slide: outline has ${slides.length}, source has ${contract.sourceSlideCount}`);
  }

  if (workMode === 'edit') {
    const changed = slides.filter((slide) => slide.changed === true);
    if (!changed.length) {
      errors.push('edit requires at least one slide with changed: true');
    }
    for (const slide of changed) {
      if (!String(slide.changeNote || '').trim()) {
        errors.push(`changed page "${slide.id}" has no changeNote`);
      }
    }
    if (Array.isArray(contract.editScope)) {
      const declared = [...new Set(contract.editScope)].sort().join(',');
      const actual = changed.map((slide) => slide.id).sort().join(',');
      if (declared !== actual) {
        errors.push(`contract.editScope (${declared || 'empty'}) does not match the changed pages (${actual || 'none'})`);
      }
    }
  }

  const last = slides[slides.length - 1];
  if (last && last.role === 'ending' && /^(谢谢|感谢|thank you)/i.test(String(last.title || '').trim())) {
    warnings.push('ending page is a bare thank-you; give it a takeaway or drop it');
  }

  const tocs = slides.filter((slide) => slide.role === 'toc');
  if (tocs.length > 1) warnings.push(`outline has ${tocs.length} table-of-contents pages; one is usually enough`);
  if (tocs.length === 1) {
    const tocIndex = slides.indexOf(tocs[0]);
    const firstBody = slides.findIndex((slide) => slide.role === 'content' || slide.role === 'hero');
    if (firstBody !== -1 && tocIndex > firstBody) {
      warnings.push('table-of-contents page appears after content pages');
    }
    if (!Array.isArray(tocs[0].points) || !tocs[0].points.length) {
      warnings.push('table-of-contents page has no points; the executor will derive entries from section titles');
    }
  }

  for (const hero of slides.filter((slide) => slide.role === 'hero')) {
    if ((hero.points || []).length > 3) {
      warnings.push(`hero page "${hero.id}" has ${hero.points.length} points; a hero page reads best with one line`);
    }
  }
}

// Optional planning hint: a density mix that is all-dense reads as a wall.
const contentSlides = slides.filter((slide) => slide.role === 'content');
if (contentSlides.length >= 4 && effectiveReadingMode !== 'text') {
  const breathing = contentSlides.filter((slide) => rhythmFor(slide) === 'breathing').length;
  if (!breathing) warnings.push('no content page is marked lean; long decks usually need one pause');
}

const report = {
  ok: errors.length === 0,
  status: outline.status,
  revision: outline.revision,
  slides: slides.length,
  rhythm: slides.reduce((acc, slide) => {
    const tag = rhythmFor(slide);
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {}),
  errors,
  warnings,
};

if (args.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  for (const warning of warnings) console.warn(`[WARN] ${warning}`);
  if (errors.length) {
    for (const error of errors) console.error(`[BLOCK] ${error}`);
    console.error(`\n[FAIL] ${errors.length} error(s), ${warnings.length} warning(s)`);
  } else {
    console.log(`[OK] outline ${outline.status} rev ${outline.revision}: ${slides.length} slides, ${warnings.length} warning(s)`);
  }
}

process.exit(errors.length ? 1 : 0);
