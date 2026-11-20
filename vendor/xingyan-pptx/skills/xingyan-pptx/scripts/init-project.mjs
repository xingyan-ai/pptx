#!/usr/bin/env node
import { expandUserPath } from './lib/paths.mjs';
import { readJsonFile } from './lib/json.mjs';
/**
 * Create a Deck Studio project skeleton.
 *
 * Usage:
 *   node scripts/init-project.mjs <project-dir> [--theme <theme-id>] [--name "Deck title"]
 *
 * The theme is optional. Without it the project follows the engine design
 * untouched; with it the theme is only bound and can be applied later with
 * apply-theme.mjs under an explicit scope.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

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
const project = path.resolve(expandUserPath(args._[0] || ''));
const theme = typeof args.theme === 'string' ? args.theme : '';
if (!project) {
  console.error('Usage: init-project.mjs <project-dir> [--theme <theme-id>] [--name "Deck title"]');
  process.exit(1);
}
if (theme && !fs.existsSync(path.join(ROOT, 'themes', 'tokens', `${theme}.json`))) {
  console.error(`Unknown theme: ${theme}`);
  process.exit(2);
}

for (const dir of ['sources', 'svg_output', 'svg_final', 'images', 'notes', 'icons', 'exports', 'validation', 'analysis', 'templates', 'assets']) {
  fs.mkdirSync(path.join(project, dir), { recursive: true });
}
fs.cpSync(
  path.join(ROOT, 'assets', 'icons', 'tabler-outline'),
  path.join(project, 'icons', 'tabler-outline'),
  { recursive: true },
);

if (theme) {
  const packageDir = path.join(ROOT, 'themes', 'packages', theme);
  for (const name of ['design_spec.fragment.md', 'spec_lock.fragment.md', 'theme.css', 'tokens.json', 'README.md']) {
    const source = path.join(packageDir, name);
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(project, name));
  }

  const selectionPath = path.join(project, 'theme_selection.json');
  if (!fs.existsSync(selectionPath)) {
    execFileSync(process.execPath, [
      path.join(HERE, 'theme-select.mjs'),
      'choose',
      '--theme', theme,
      '--out', selectionPath,
    ], { stdio: 'ignore', windowsHide: true });
  }
  const selection = readJsonFile(selectionPath);
  selection.localTokensPath = 'tokens.json';
  selection.localThemeCss = 'theme.css';
  fs.writeFileSync(selectionPath, JSON.stringify(selection, null, 2) + '\n', 'utf8');
}

const title = args.name || path.basename(project);
const themeLines = theme
  ? `- theme bound (optional): \`${theme}\`
- apply it explicitly: \`node scripts/apply-theme.mjs . --theme ${theme} --scope colors\`
- theme selection: \`theme_selection.json\``
  : '- theme: none (engine design is kept as-is)';

fs.writeFileSync(
  path.join(project, 'README.md'),
  `# ${title}

${themeLines}
- story source: \`outline.json\` (edit and confirm before anything else)
- story contract: \`design_spec.md\` §IX (projected, never hand-written)
- design lock: \`spec_lock.md\`
- pages: \`svg_output/\`
- HTML: \`exports/\`

Next:

1. Write \`outline.json\` (\`status: "draft"\`); the user edits and confirms it.
2. Run \`node scripts/outline-check.mjs .\`, then \`node scripts/outline-to-spec.mjs .\`.
3. Fill §II–§VIII and §X in \`design_spec.md\`; run \`node scripts/check-design-spec.mjs .\`.
4. Optional: \`node scripts/apply-theme.mjs . --theme ${theme || '<id>'} --scope visual\`.
5. Author \`svg_output/P01.svg\` … from §IX, in order.
6. \`node scripts/svg-deck-to-html.mjs .\` for the HTML deck.
7. \`node scripts/pptx-backend-client.mjs . --endpoint ...\` for PPTX.
`,
  'utf8',
);

console.log(`[OK] project -> ${project}`);
console.log(theme ? `[OK] theme ${theme} bound (not applied)` : '[OK] no theme bound');
console.log('Next: write design_spec.md §I–§X, then run check-design-spec.mjs');
