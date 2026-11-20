#!/usr/bin/env node
import { expandUserPath } from './lib/paths.mjs';
import { readJsonFile } from './lib/json.mjs';
/**
 * 从已生成的页面反推 spec_lock 的结构化四段。
 *
 *   node scripts/gen-spec-lock.mjs <project>            # 写入
 *   node scripts/gen-spec-lock.mjs <project> --check    # 只校验，缺什么报什么
 *
 * 只重写 pptx_structure / pptx_masters / pptx_layouts / page_pptx_layouts，
 * 其余段（communication、colors、visual_style…）原样保留。
 *
 * 页数、每页用哪个版式完全由 svg_output 决定，脚本不假设页数或顺序。
 */

import fs from 'node:fs';
import path from 'node:path';

const REQUIRED_ROLES = ['display', 'metric', 'title', 'subtitle', 'body', 'annotation'];
const DEFAULT_ROLES = { display: 60, metric: 36, title: 32, subtitle: 21, body: 19, annotation: 14 };

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) { args._.push(item); continue; }
    const key = item.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) { args[key] = next; i += 1; }
    else args[key] = true;
  }
  return args;
}

const attr = (tag, name) => {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(tag);
  return m ? m[1] : null;
};

function readPages(project) {
  const dir = path.join(project, 'svg_output');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((n) => n.endsWith('.svg')).sort().map((name) => {
    const source = fs.readFileSync(path.join(dir, name), 'utf8');
    const root = /<svg\b[^>]*>/i.exec(source);
    const tag = root ? root[0] : '';
    return {
      stem: name.replace(/\.svg$/i, ''),
      file: name,
      master: attr(tag, 'data-pptx-master'),
      masterName: attr(tag, 'data-pptx-master-name'),
      layout: attr(tag, 'data-pptx-layout'),
      layoutName: attr(tag, 'data-pptx-layout-name'),
    };
  });
}

function readPrototypes(project) {
  // apply_template 会把版式原型装到 <project>/templates/
  const dir = path.join(project, 'templates');
  const map = new Map();
  if (!fs.existsSync(dir)) return map;
  for (const name of fs.readdirSync(dir).filter((n) => n.endsWith('.svg'))) {
    const source = fs.readFileSync(path.join(dir, name), 'utf8');
    const root = /<svg\b[^>]*>/i.exec(source);
    const tag = root ? root[0] : '';
    const key = attr(tag, 'data-pptx-layout') || /^(\d+[a-z]?_[a-z_]+)/i.exec(name)?.[1];
    if (key) map.set(key, { file: name, name: attr(tag, 'data-pptx-layout-name') || key });
  }
  return map;
}

function readTemplate(project) {
  const candidates = [];
  const install = path.join(project, 'template_install.json');
  if (fs.existsSync(install)) {
    try {
      const data = readJsonFile(install);
      const roots = data.roots || data.root || data.installedRoots || [];
      for (const r of Array.isArray(roots) ? roots : [roots]) {
        if (typeof r === 'string') candidates.push(path.join(r, 'template.json'));
        else if (r && r.root) candidates.push(path.join(r.root, 'template.json'));
      }
    } catch { /* ignore */ }
  }
  candidates.push(path.join(project, 'template.json'));
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      try { return readJsonFile(file); } catch { /* ignore */ }
    }
  }
  return null;
}

function readSpecLock(project) {
  const file = path.join(project, 'spec_lock.md');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function splitSections(text) {
  const header = [];
  const sections = new Map();
  let current = null;
  for (const line of text.split('\n')) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) { current = m[1]; sections.set(current, []); continue; }
    if (current) sections.get(current).push(line);
    else header.push(line);
  }
  return { header, sections };
}

function buildSections(pages, prototypes, template) {
  const masters = new Map();
  for (const p of pages) if (p.master) masters.set(p.master, p.masterName || p.master);

  const layouts = new Map();
  const pageRows = [];
  const problems = [];

  for (const p of pages) {
    if (!/^P\d{2,}$/.test(p.stem)) {
      problems.push(`页 ${p.file} 的文件名不是 P<NN>，结构化导出要求 P01、P02…`);
    }
    if (!p.layout) {
      // 无版式的页面属于 flat 稿，不算错误；由导出侧决定是否切 flat
      continue;
    }
    const proto = prototypes.get(p.layout);
    if (!proto) problems.push(`页 ${p.file} 的版式 '${p.layout}' 在 templates/ 里找不到原型`);
    if (!layouts.has(p.layout)) {
      layouts.set(p.layout, {
        master: p.master || '',
        name: p.layoutName || proto?.name || p.layout,
        file: proto?.file || '',
      });
    }
    pageRows.push([p.stem, p.layout]);
  }

  const roles = { ...DEFAULT_ROLES, ...(template?.structure?.typeScale ? {} : {}) };
  const structural = new Map();
  structural.set('pptx_structure', [
    '- mode: structured',
    '- template_reuse_scope: layout',
    '- template_adherence: adaptive',
  ]);
  structural.set('pptx_masters', [...masters].map(([k, v]) => `- ${k}: ${v}`));
  structural.set('pptx_layouts', [...layouts].map(([k, v]) =>
    `- ${k}: ${v.master} | ${v.name} | template:${v.file}`));
  structural.set('page_pptx_layouts', pageRows.map(([stem, key]) => `- ${stem}: ${key}`));
  structural.set('page_layouts', pageRows.map(([stem, key]) => {
    const stemName = prototypes.get(key)?.file?.replace(/\.svg$/i, '') || key;
    return `- ${stem}: ${stemName}`;
  }));
  return { structural, problems };
}

function check(existing, structural) {
  const { sections } = splitSections(existing);
  const problems = [];
  if (!existing) return ['spec_lock.md 不存在，先运行 node scripts/gen-spec-lock.mjs <project>'];

  const mode = (sections.get('pptx_structure') || []).join('\n');
  if (!/mode:\s*structured/.test(mode)) {
    problems.push('缺 pptx_structure 段或 mode 不是 structured；应写：\n  ## pptx_structure\n  - mode: structured');
  }
  for (const key of ['pptx_masters', 'pptx_layouts', 'page_pptx_layouts']) {
    const want = structural.get(key) || [];
    const have = (sections.get(key) || []).map((l) => l.trim()).filter((l) => l.startsWith('-'));
    if (!have.length) {
      problems.push(`缺 ${key} 段；应写：\n${want.join('\n')}`);
      continue;
    }
    for (const line of want) {
      const key2 = line.split(':')[0];
      const matched = have.some((h) => h.startsWith(key2 + ':'));
      if (!matched) problems.push(`${key} 缺 ${key2}；应写： ${line}`);
    }
  }
  return problems;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const project = path.resolve(expandUserPath(args._[0] || ''));
  if (!project || !fs.existsSync(project)) {
    console.error('Usage: gen-spec-lock.mjs <project> [--check]');
    process.exit(1);
  }
  const pages = readPages(project);
  if (!pages.length) {
    console.error(`[ERR] ${path.join(project, 'svg_output')} 下没有 SVG 页面`);
    process.exit(1);
  }
  if (args.flat) {
    const existingFlat = readSpecLock(project);
    const { header, sections } = splitSections(existingFlat);
    sections.set('pptx_structure', ['- mode: flat']);
    for (const key of ['pptx_masters', 'pptx_layouts', 'page_pptx_layouts', 'page_layouts']) sections.delete(key);
    const order = ['canvas', 'communication', 'mode', 'visual_style', 'colors', 'typography', 'icons',
      'pptx_structure', 'page_rhythm'];
    const out = [];
    out.push(...(header.length ? header : ['<!-- ppt-master-schema: spec-lock/v1 -->', '# Execution Lock', '']));
    for (const key of order) {
      if (!sections.has(key)) continue;
      out.push(`## ${key}`); out.push(...sections.get(key)); out.push('');
    }
    // Keep every other section (images, forbidden, components, decoration…).
    // Dropping them made the post-degrade quality gate report "absent from
    // spec_lock.md images" and hid the real reason for the downgrade.
    for (const [key, lines] of sections) {
      if (order.includes(key)) continue;
      out.push(`## ${key}`); out.push(...lines); out.push('');
    }
    fs.writeFileSync(path.join(project, 'spec_lock.md'), out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n', 'utf8');
    console.log('[OK] spec_lock 已切到 flat 模式');
    return;
  }

  const prototypes = readPrototypes(project);
  const template = readTemplate(project);
  const { structural, problems } = buildSections(pages, prototypes, template);

  if (args.check) {
    const issues = [...problems, ...check(readSpecLock(project), structural)];
    if (issues.length) {
      console.log('[NEEDS-FIX]');
      for (const p of issues) console.log(' - ' + p);
      process.exit(1);
    }
    console.log(`[OK] spec_lock 结构化配置完整（${pages.length} 页）`);
    return;
  }

  const existing = readSpecLock(project);
  const { header, sections } = splitSections(existing);
  for (const [key, lines] of structural) sections.set(key, lines);
  const order = ['canvas', 'communication', 'mode', 'visual_style', 'colors', 'typography', 'icons',
    'pptx_structure', 'pptx_masters', 'pptx_layouts', 'page_pptx_layouts', 'page_layouts', 'page_rhythm'];
  const out = [];
  out.push(...(header.length ? header : ['<!-- ppt-master-schema: spec-lock/v1 -->', '# Execution Lock', '']));
  for (const key of order) {
    if (!sections.has(key)) continue;
    out.push(`## ${key}`);
    out.push(...sections.get(key).filter((l, i, a) => !(i === a.length - 1 && l === '')));
    out.push('');
  }
  for (const [key, lines] of sections) {
    if (order.includes(key)) continue;
    out.push(`## ${key}`);
    out.push(...lines);
    out.push('');
  }
  fs.writeFileSync(path.join(project, 'spec_lock.md'), out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n', 'utf8');
  console.log(`[OK] spec_lock 已更新（${pages.length} 页，${structural.get('pptx_layouts').length} 个版式）`);
  for (const p of problems) console.log(' [warn] ' + p);
}

main();
