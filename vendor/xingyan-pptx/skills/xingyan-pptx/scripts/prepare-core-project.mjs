#!/usr/bin/env node
import { expandUserPath } from './lib/paths.mjs';
import { readJsonFile } from './lib/json.mjs';
/**
 * Prepare a brand-core project: zhongtai brand frame + PPT Master content layouts.
 *
 *   node scripts/prepare-core-project.mjs <project>
 *
 * Fixed pages (cover / title / TOC / section / ending) and the brand background
 * images stay exactly as the zhongtai template defines them. Content pages use
 * the core-* layouts (06c/06d/06k/06cmp/06t/06s) that port PPT Master's content
 * compositions into the brand safe area. No neutral presentation_core master is
 * installed; the logo, background, title bar and TOC are preserved.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BRAND = path.join(ROOT, 'templates', 'brand', 'zhongtai-v5');
const BRAND_TEMPLATES = path.join(BRAND, 'templates');
const BRAND_IMAGES = path.join(BRAND, 'images');

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
if (!project) {
  console.error('Usage: prepare-core-project.mjs <project>');
  process.exit(1);
}
if (!fs.existsSync(BRAND_TEMPLATES)) {
  console.error(`[ERR] 品牌模板不存在：${BRAND_TEMPLATES}`);
  process.exit(1);
}
if (args.theme && args.theme !== 'zhongtai-brand') {
  console.error(`[ERR] 品牌-core 模式只使用 zhongtai-brand paint；收到 --theme ${args.theme}。`);
  console.error('      如果要换主题 paint，请使用 --layout-system brand 的普通主题稿，或后续版本的主题 skin。');
  process.exit(1);
}

const templatesDir = path.join(project, 'templates');
const imagesDir = path.join(project, 'images');
fs.mkdirSync(templatesDir, { recursive: true });
fs.mkdirSync(imagesDir, { recursive: true });

// Keep the directory deterministic: remove stale SVGs before copying.
for (const name of fs.readdirSync(templatesDir)) {
  if (name.endsWith('.svg')) fs.unlinkSync(path.join(templatesDir, name));
}
const svgs = fs.readdirSync(BRAND_TEMPLATES).filter((name) => name.endsWith('.svg')).sort();
for (const name of svgs) fs.copyFileSync(path.join(BRAND_TEMPLATES, name), path.join(templatesDir, name));
for (const name of fs.readdirSync(BRAND_IMAGES)) {
  const source = path.join(BRAND_IMAGES, name);
  if (fs.statSync(source).isFile()) fs.copyFileSync(source, path.join(imagesDir, name));
}

const template = readJsonFile(path.join(BRAND, 'template.json'));
fs.writeFileSync(path.join(project, 'template.json'), JSON.stringify(template, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(project, 'theme_selection.json'), JSON.stringify({
  schemaVersion: 1,
  id: 'zhongtai-brand',
  name: '中泰品牌',
  source: 'prepare-core-project',
}, null, 2) + '\n', 'utf8');

const coreLayouts = svgs.filter((name) => name.startsWith('06'));
console.log(`[OK] 品牌-core 已装：${svgs.length} 个原型（固定页 + ${coreLayouts.length} 个 PPT Master 内容版式）`);
console.log(`[OK] 品牌底图/logo 沿用 images/；固定页 cover/title/toc/ending 不变`);
console.log('[next] node scripts/build-deck.mjs <project> --layout-system core --format both');
