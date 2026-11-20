import { readJsonFile } from './json.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeLanguage } from './outline.mjs';

/**
 * Resolve the deck language from the story source first, then the design
 * contract, then a safe default. The value is always a BCP-47 tag so the
 * HTML export and the PPTX backend can use it for proofing language,
 * RTL defaults, theme script slots and docProps.
 */
export function readProjectLanguage(project) {
  const outlinePath = path.join(project, 'outline.json');
  if (fs.existsSync(outlinePath)) {
    try {
      const outline = readJsonFile(outlinePath);
      const normalized = normalizeLanguage(outline.contract?.primaryLanguage);
      if (normalized) return normalized;
    } catch {
      // Fall through to the design spec.
    }
  }
  const specPath = path.join(project, 'design_spec.md');
  if (fs.existsSync(specPath)) {
    const match = fs.readFileSync(specPath, 'utf8').match(/^\|\s*Language\s*\|\s*(.+?)\s*\|/m);
    if (match) {
      const normalized = normalizeLanguage(match[1]);
      if (normalized) return normalized;
    }
  }
  return 'zh-CN';
}
