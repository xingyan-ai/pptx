#!/usr/bin/env node
/** Audit theme tokens before packaging. Usage: node scripts/audit-themes.mjs */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const TOKENS = path.join(ROOT, 'themes', 'tokens');
const PREVIEWS = path.join(ROOT, 'previews');
const OVERRIDES = path.join(ROOT, 'themes', 'overrides.json');

const VALID_FIDELITY = new Set(['native', 'approximate', 'html-only']);
const REQUIRED_COLORS = ['background', 'surface', 'surfaceAlt', 'text', 'textMuted', 'primary', 'accent', 'accent2', 'textAccent', 'rule', 'onAccent', 'onPrimary', 'chart'];
const REQUIRED_TYPE = ['display', 'title', 'metric', 'subtitle', 'body', 'annotation', 'title_stack', 'body_stack', 'title_stack_ppt', 'body_stack_ppt'];
const REQUIRED_SPACING = ['margin', 'gap', 'gutter', 'radius', 'leading'];

const overrides = fs.existsSync(OVERRIDES) ? JSON.parse(fs.readFileSync(OVERRIDES, 'utf8')) : {};
const report = { count: 0, passed: 0, review: [], manualReviewed: [], themes: [] };

for (const name of fs.readdirSync(TOKENS).filter((item) => item.endsWith('.json')).sort()) {
  const tokens = JSON.parse(fs.readFileSync(path.join(TOKENS, name), 'utf8'));
  const issues = [];
  for (const key of REQUIRED_COLORS) if (!(key in (tokens.colors || {}))) issues.push(`missing color ${key}`);
  for (const key of REQUIRED_TYPE) if (!(key in (tokens.typography || {}))) issues.push(`missing type ${key}`);
  for (const key of REQUIRED_SPACING) if (!(key in (tokens.spacing || {}))) issues.push(`missing spacing ${key}`);

  const c = tokens.contrast || {};
  if ((c.body_contrast || 0) < 4.5) issues.push(`body contrast ${c.body_contrast} < 4.5`);
  if ((c.primary_contrast || 0) < 3.0) issues.push(`primary contrast ${c.primary_contrast} < 3.0`);
  if ((c.text_accent_contrast || 0) < 3.0) issues.push(`text accent contrast ${c.text_accent_contrast} < 3.0`);
  if (tokens.colors?.accent === tokens.colors?.accent2 && !(tokens.id in overrides)) {
    issues.push('accent equals accent2 and no override');
  }
  if (!VALID_FIDELITY.has(tokens.pptFidelity)) issues.push(`invalid fidelity ${tokens.pptFidelity}`);
  for (const page of ['P01.svg', 'P02.svg', 'P03.svg']) {
    if (!fs.existsSync(path.join(PREVIEWS, tokens.id, page))) issues.push(`missing preview ${page}`);
  }
  issues.push(...(tokens.warnings || []), ...(tokens.fontWarnings || []));

  const status = issues.length ? 'review' : 'pass';
  report.count += 1;
  if (status === 'pass') report.passed += 1;
  else report.review.push(tokens.id);
  if (tokens.id in overrides) report.manualReviewed.push(tokens.id);
  report.themes.push({
    id: tokens.id,
    name: tokens.name,
    status,
    issues,
    overrideNote: tokens.overrideNote || '',
    pptFidelity: tokens.pptFidelity,
    visualStyle: tokens.visualStyle,
    contrast: c,
  });
}

const out = path.join(ROOT, 'assets', 'theme-audit.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(`[OK] ${report.count} theme(s), ${report.passed} pass, ${report.review.length} need review -> ${out}`);
if (report.review.length) console.log('review:', report.review.join(', '));
console.log(`manual overrides: ${report.manualReviewed.length}`);
