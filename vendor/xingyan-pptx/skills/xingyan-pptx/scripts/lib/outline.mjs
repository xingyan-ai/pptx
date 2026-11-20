/**
 * The outline is the story's single source of truth.
 *
 * `design_spec.md` §IX is a deterministic projection of `outline.json`, never a
 * place where the agent may rewrite the user's page titles, order or content.
 * Everything here is pure so the projection can be recomputed and compared.
 */

import crypto from 'node:crypto';
import { sceneDefaults } from './scenes.mjs';

export const ROLES = ['cover', 'toc', 'section', 'hero', 'content', 'ending'];
export const DENSITIES = ['rich', 'standard', 'lean'];
export const STATUSES = ['draft', 'confirmed'];
export const READING_MODES = ['text', 'balanced', 'presentation'];

// Scene words that usually mean the deck will be read without a presenter.
// This is a default only: an explicit readingMode always wins.
const PRESENTATION_SCENE = /发布会|产品亮相|路演|演讲|宣讲|大会/;
const TEXT_SCENE = /汇报|复盘|决策|评审|研报|研究|分析|通读|参考|培训|教程|说明|方案|规划|总结/;

export function defaultReadingMode(scene) {
  const preset = sceneDefaults(scene);
  if (preset) return preset.readingMode;
  // Unknown scene labels keep the old keyword fallback.
  const value = String(scene ?? '');
  if (PRESENTATION_SCENE.test(value)) return 'presentation';
  if (TEXT_SCENE.test(value)) return 'text';
  return 'balanced';
}

/**
 * Normalize the product's language label to a BCP-47 tag the engine can use
 * for proofing language, RTL defaults, script slots and docProps.
 */
export function normalizeLanguage(language) {
  const raw = String(language ?? '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();
  if (lower === 'zh' || lower === 'zh-cn' || lower === 'zh-hans' || lower === 'zh-hans-cn') return 'zh-CN';
  if (lower === 'zh-tw' || lower === 'zh-hk' || lower === 'zh-hant' || lower === 'zh-hant-tw') return 'zh-TW';
  if (lower === 'en' || lower === 'en-us') return 'en-US';
  if (lower === 'en-gb') return 'en-GB';
  // A valid script/region tag such as fr-FR or pt-BR passes through.
  if (/^[a-z]{2,3}(-[a-z0-9]{2,8})+$/i.test(raw)) return raw;
  return '';
}

/**
 * Normalize the per-page content fields. `points` stay the claims; the
 * optional `evidence` / `soWhat` / `action` / `source` fields carry the depth
 * that a one-line outline used to lose.
 */
export function contentStats(slide) {
  const list = (value) => (Array.isArray(value) ? value : [value])
    .map(oneLine)
    .filter(Boolean);
  const points = list(slide?.points);
  const evidence = list(slide?.evidence);
  const soWhat = oneLine(slide?.soWhat);
  const action = oneLine(slide?.action);
  const source = oneLine(slide?.source);
  const chars = [points.join(''), evidence.join(''), soWhat, action].join('').length;
  return { points, evidence, soWhat, action, source, chars };
}

const PLACEHOLDER_PATTERNS = [
  /具体(动作|能力点|内容|方案|做法|步骤)/,
  /若干/,
  /等等/,
  /待补充|待定|待确认/,
  /\bTBD\b/i,
  /\bTODO\b/i,
  /详见|见附件/,
];

/** Placeholder phrasing means the outline is still a skeleton, not content. */
export function findPlaceholders(slide) {
  const stats = contentStats(slide);
  const haystack = [stats.points.join('；'), stats.evidence.join('；'), stats.soWhat, stats.action]
    .filter(Boolean)
    .join('；');
  if (!haystack) return [];
  return PLACEHOLDER_PATTERNS
    .map((pattern) => (haystack.match(pattern) || [])[0])
    .filter(Boolean);
}

/**
 * The engine's flat-page vocabulary: cover / toc / section / content / ending.
 * `hero` is our outline role for an impact page, which the engine expresses as
 * a content page carrying a hero moment.
 */
export function pageRoleFor(slide) {
  return slide.role === 'hero' ? 'content' : slide.role;
}

/** Fields a projection reads. Hashing only these keeps confirm/undo churn out. */
function storyOf(outline) {
  return {
    schemaVersion: outline.schemaVersion ?? 1,
    revision: outline.revision ?? 0,
    contract: outline.contract ?? {},
    slides: outline.slides ?? [],
  };
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

export function outlineSha(outline) {
  return crypto.createHash('sha256').update(canonical(storyOf(outline))).digest('hex');
}

/** Page rhythm is derived, never authored separately. */
export function rhythmFor(slide) {
  if (['cover', 'toc', 'section', 'ending'].includes(slide.role)) return 'anchor';
  if (slide.role === 'hero') return 'breathing';
  return slide.density === 'lean' ? 'breathing' : 'dense';
}

function oneLine(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

export function renderSlide(slide, index, themeProse) {
  const number = String(index + 1).padStart(2, '0');
  const stats = contentStats(slide);
  const content = stats.points.length ? stats.points.join('；') : '—';
  const relationships = oneLine(slide.relationships) || 'none';
  const audienceMove = oneLine(slide.audienceMove) || '—';

  // A Composition the user wrote always wins. Otherwise structural pages borrow
  // the theme's own layout language, marked non-binding.
  let composition = oneLine(slide.composition);
  if (!composition) {
    if (slide.role === 'toc' && themeProse?.tocStructure) {
      composition = `主题建议（非绑定）：${oneLine(themeProse.tocStructure)}`;
    } else if (slide.role === 'hero' && themeProse?.heroStructure) {
      composition = `主题建议（非绑定）：${oneLine(themeProse.heroStructure)}`;
    } else if (slide.role === 'hero') {
      composition = 'hero moment：单一大图或单一大数字，文字只留一句';
    } else {
      composition = '由执行层按内容决定';
    }
  }

  const depth = [];
  if (stats.evidence.length) depth.push(`- **Evidence**: ${stats.evidence.join('；')}`);
  if (stats.soWhat) depth.push(`- **So what**: ${stats.soWhat}`);
  if (stats.action) depth.push(`- **Action**: ${stats.action}`);
  if (stats.source) depth.push(`- **Source**: ${stats.source}`);

  return [
    `#### Slide ${number} - ${oneLine(slide.title)}`,
    '',
    `- **Page role**: ${pageRoleFor(slide)}`,
    `- **Audience move**: ${audienceMove}`,
    `- **Relationships**: ${relationships}`,
    `- **Composition**: ${composition}`,
    `- **Title**: ${oneLine(slide.title)}`,
    `- **Core message**: ${oneLine(slide.coreMessage)}`,
    `- **Content**: ${content}`,
    ...depth,
  ].join('\n');
}

export function renderOutline(outline, themeProse) {
  return (outline.slides || []).map((slide, index) => renderSlide(slide, index, themeProse)).join('\n\n');
}

export function markerLine(outline) {
  return `<!-- outline-rev: ${outline.revision ?? 0} sha:${outlineSha(outline)} -->`;
}

/**
 * The user-owned fields of every page, in order. Relationships, Composition and
 * other derived lines are deliberately excluded: the strategist may add those
 * around the projection without the gate calling it drift.
 */
function contentSignature(slide) {
  const stats = contentStats(slide);
  const parts = [stats.points.length ? stats.points.join('；') : '—'];
  if (stats.evidence.length) parts.push(`Evidence: ${stats.evidence.join('；')}`);
  if (stats.soWhat) parts.push(`So what: ${stats.soWhat}`);
  if (stats.action) parts.push(`Action: ${stats.action}`);
  if (stats.source) parts.push(`Source: ${stats.source}`);
  return parts.join(' || ');
}

export function storySignature(outline) {
  return (outline.slides || []).map((slide) => ({
    heading: oneLine(slide.title),
    title: oneLine(slide.title),
    coreMessage: oneLine(slide.coreMessage),
    content: contentSignature(slide),
  }));
}

/** Parse the same signature back out of a rendered §IX. */
export function specStorySignature(spec) {
  const re = /^####\s+Slide\s+\d+\s*(?:[-—:]\s*)?(.*)$/gm;
  const blocks = [];
  let match;
  while ((match = re.exec(spec))) {
    blocks.push({ start: match.index, end: match.index + match[0].length, name: match[1].trim() });
  }
  return blocks.map((block, index) => {
    const body = spec.slice(block.end, blocks[index + 1]?.start ?? spec.length);
    const field = (name) => {
      const found = body.match(new RegExp(`^-\\s*\\*\\*${name}\\*\\*:\\s*(.*)$`, 'm'));
      return found ? found[1].trim() : '';
    };
    const content = [field('Content') || '—'];
    const evidence = field('Evidence');
    const soWhat = field('So what');
    const action = field('Action');
    const source = field('Source');
    if (evidence) content.push(`Evidence: ${evidence}`);
    if (soWhat) content.push(`So what: ${soWhat}`);
    if (action) content.push(`Action: ${action}`);
    if (source) content.push(`Source: ${source}`);
    return {
      heading: block.name,
      title: field('Title'),
      coreMessage: field('Core message'),
      content: content.join(' || '),
    };
  });
}

export function readMarker(spec) {
  const match = spec.match(/<!--\s*outline-rev:\s*(\d+)\s+sha:([0-9a-f]{64})\s*-->/);
  return match ? { revision: Number(match[1]), sha: match[2] } : null;
}

/** Extract one `## section` verbatim. */
export function sectionOf(text, heading) {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line.trim() === heading.trim());
  if (start === -1) return '';
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^##\s/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

/** Replace the whole §IX body, keeping its heading and the marker. */
export function projectIX(spec, outline, themeProse) {
  const heading = '## IX. Content Outline';
  const lines = spec.split('\n');
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) return null;

  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^##\s/.test(lines[i])) {
      end = i;
      break;
    }
  }

  const body = [markerLine(outline), '', `### Part 1: ${oneLine(outline.contract?.projectName) || 'Deck'}`, '', renderOutline(outline, themeProse)];
  const tail = lines.slice(end);
  const head = lines.slice(0, start + 1);
  while (head.length && head[head.length - 1].trim() === '') head.pop();
  return [...head, '', ...body, '', ...tail].join('\n');
}

/** Set one row of the §I markdown table, leaving the rest untouched. */
export function setSpecRow(spec, label, value) {
  if (!value) return spec;
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^\\|\\s*${escaped}\\s*\\|.*\\|\\s*$`, 'm');
  if (re.test(spec)) return spec.replace(re, `| ${label} | ${value} |`);
  return spec;
}

/** Read the §I table value for a label. */
export function getSpecRow(spec, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = spec.match(new RegExp(`^\\|\\s*${escaped}\\s*\\|\\s*(.*?)\\s*\\|\\s*$`, 'm'));
  return match ? match[1] : null;
}

export function renderRhythmLock(outline) {
  const rows = (outline.slides || []).map((slide, index) => {
    const page = `P${String(index + 1).padStart(2, '0')}`;
    return `- ${page}: ${rhythmFor(slide)}`;
  });
  return ['## page_rhythm', ...rows].join('\n');
}

export function renderCommunicationLock(outline, readingModeOverride, languageOverride) {
  const c = outline.contract || {};
  const objective = [c.communicationIntent, c.audienceOutcome].filter(Boolean).join('；');
  const rows = [
    ['primary_language', languageOverride || c.primaryLanguage],
    ['audience', c.audience],
    ['objective', objective],
    ['core_message', c.coreMessage],
    ['consumption_mode', readingModeOverride || c.readingMode],
  ].filter(([, value]) => value);
  return ['## communication', ...rows.map(([key, value]) => `- ${key}: ${oneLine(value)}`)].join('\n');
}

/** Rebuild one `## block` in the lock, appending it when absent. */
export function setLockBlock(lock, heading, body) {
  const lines = lock.split('\n');
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start === -1) {
    return `${lock.replace(/\s+$/, '')}\n\n${body.trim()}\n`;
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^##\s/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return [...lines.slice(0, start), body.trim(), '', ...lines.slice(end)].join('\n');
}
