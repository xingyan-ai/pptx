#!/usr/bin/env node
/**
 * Client input gate for Plan A.
 *
 * Usage:
 *   node scripts/check-inputs.mjs <project-or-sources-dir>
 *
 * Accepts Markdown, HTML, DOCX, PPTX, XLSX, CSV. Rejects PDF/EPUB with a
 * clear message so the desktop client never needs PyMuPDF/ebooklib.
 */

import fs from 'node:fs';
import path from 'node:path';

const ALLOWED = new Set(['.md', '.markdown', '.html', '.htm', '.docx', '.pptx', '.xlsx', '.xlsm', '.csv', '.tsv', '.txt', '.json', '.yaml', '.yml']);
const BLOCKED = new Set(['.pdf', '.epub']);

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

function collect(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) collect(full, out);
    else out.push(full);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const target = path.resolve(args._[0] || '');
if (!target || !fs.existsSync(target)) {
  console.error('Usage: check-inputs.mjs <project-or-sources-dir>');
  process.exit(1);
}
const isProject = fs.existsSync(path.join(target, 'design_spec.md'))
  || fs.existsSync(path.join(target, 'svg_output'));
const sourcesDir = path.join(target, 'sources');
if (isProject && !fs.existsSync(sourcesDir)) {
  console.log('[OK] no sources/ directory; content may be supplied in conversation.');
  process.exit(0);
}
const sources = fs.existsSync(sourcesDir) ? sourcesDir : target;
const files = fs.statSync(sources).isDirectory() ? collect(sources) : [sources];
const blocked = files.filter((file) => BLOCKED.has(path.extname(file).toLowerCase()));
const unknown = files.filter((file) => {
  const ext = path.extname(file).toLowerCase();
  return ext && !ALLOWED.has(ext) && !BLOCKED.has(ext);
});

if (blocked.length) {
  console.error('[BLOCKED] PDF/EPUB is not supported in the desktop client (Plan A).');
  for (const file of blocked) console.error('  - ' + path.relative(sources, file));
  console.error('Convert to Markdown/HTML first, or use the cloud full-conversion service.');
  process.exit(2);
}

if (unknown.length) {
  console.warn('[WARN] Unrecognized source types (ignored):');
  for (const file of unknown) console.warn('  - ' + path.relative(sources, file));
}

console.log(`[OK] ${files.length} source file(s) passed the client input gate.`);
