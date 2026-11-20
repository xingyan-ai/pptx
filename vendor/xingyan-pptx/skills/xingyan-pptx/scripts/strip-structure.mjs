#!/usr/bin/env node
/**
 * 把结构化页面降级为 flat 页面：删掉母版/版式/占位符标记，保留全部可见内容。
 *
 *   node scripts/strip-structure.mjs <project> [--dir svg_output]
 *
 * 用途：结构化导出反复不通过时，导出一份 flat 版本，保证至少能交付；
 * flat 版本没有母版和版式，PPT 里不能统一改标题位置。
 */

import fs from 'node:fs';
import path from 'node:path';

const ATTRS = [
  'data-pptx-master', 'data-pptx-master-name', 'data-pptx-layout', 'data-pptx-layout-name',
  'data-pptx-layer', 'data-pptx-placeholder', 'data-pptx-idx', 'data-pptx-carrier',
  'data-pptx-binding', 'data-pptx-show-master-shapes', 'data-pptx-show-inherited-shapes',
];

const args = process.argv.slice(2);
const project = path.resolve(args[0] || '');
if (!project || !fs.existsSync(project)) {
  console.error('Usage: strip-structure.mjs <project>');
  process.exit(1);
}
const dir = path.join(project, 'svg_output');
const pages = fs.readdirSync(dir).filter((n) => n.endsWith('.svg')).sort();
let touched = 0;
for (const name of pages) {
  const file = path.join(dir, name);
  const source = fs.readFileSync(file, 'utf8');
  let out = source;
  for (const attr of ATTRS) {
    out = out.replace(new RegExp(`\\s${attr}="[^"]*"`, 'g'), '');
  }
  if (out !== source) {
    fs.writeFileSync(file, out, 'utf8');
    touched += 1;
  }
}
console.log(`[OK] ${touched}/${pages.length} 页已降级为 flat（母版/版式标记已移除）`);
