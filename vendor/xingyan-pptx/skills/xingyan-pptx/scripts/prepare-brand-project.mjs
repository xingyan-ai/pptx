#!/usr/bin/env node
/**
 * Install the zhongtai brand template into a project without going through
 * the engine's template validator. build-deck calls this automatically when a
 * brand project has no templates/ yet, so the agent never has to run
 * apply_template.py by hand.
 *
 *   node scripts/prepare-brand-project.mjs <project>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const BRAND = path.join(ROOT, 'templates', 'brand', 'zhongtai-v5');

const args = process.argv.slice(2);
const project = path.resolve(args[0] || '');
if (!project) {
  console.error('Usage: prepare-brand-project.mjs <project>');
  process.exit(1);
}
if (!fs.existsSync(path.join(BRAND, 'templates'))) {
  console.error(`[ERR] 品牌模板不存在：${BRAND}`);
  process.exit(1);
}

const templatesDir = path.join(project, 'templates');
const imagesDir = path.join(project, 'images');
fs.mkdirSync(templatesDir, { recursive: true });
fs.mkdirSync(imagesDir, { recursive: true });
for (const name of fs.readdirSync(templatesDir)) {
  if (name.endsWith('.svg')) fs.unlinkSync(path.join(templatesDir, name));
}
const svgs = fs.readdirSync(path.join(BRAND, 'templates')).filter((n) => n.endsWith('.svg')).sort();
for (const name of svgs) fs.copyFileSync(path.join(BRAND, 'templates', name), path.join(templatesDir, name));
for (const name of fs.readdirSync(path.join(BRAND, 'images'))) {
  const source = path.join(BRAND, 'images', name);
  if (fs.statSync(source).isFile()) fs.copyFileSync(source, path.join(imagesDir, name));
}
fs.copyFileSync(path.join(BRAND, 'template.json'), path.join(project, 'template.json'));
console.log(`[OK] 品牌模板已装：${svgs.length} 个原型 + 品牌底图`);
