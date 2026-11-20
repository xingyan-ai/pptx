#!/usr/bin/env node
/**
 * Render a project's SVG pages as a single-file HTML deck.
 *
 * Usage:
 *   node scripts/svg-deck-to-html.mjs <project> [--out deck.html]
 *     [--theme themes/tokens/swiss-signal.json] [--theme-name "Swiss Signal"]
 *     [--no-embed-fonts]
 *
 * The SVG pages remain the visual source. This script adds navigation,
 * overview, print layout, optional notes, theme CSS variables, and — unless
 * `--no-embed-fonts` is passed — inlines the theme's embeddable fonts as data
 * URIs so the HTML does not depend on what the viewer has installed.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { embedFonts } from './lib/fonts.mjs';
import { readProjectLanguage } from './lib/language.mjs';

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

function readTitle(project) {
  const spec = path.join(project, 'design_spec.md');
  if (fs.existsSync(spec)) {
    const match = fs.readFileSync(spec, 'utf8').match(/^\|\s*Project Name\s*\|\s*(.+?)\s*\|/m);
    if (match) return match[1].trim();
  }
  return path.basename(project);
}

function stripSvg(text) {
  return text
    .replace(/<\?xml[^>]*\?>\s*/i, '')
    .replace(/<!DOCTYPE[^>]*>\s*/i, '')
    .trim()
    .replace(/<svg\b/i, '<svg class="deck-svg"');
}

function externalRefs(text) {
  const refs = [];
  const re = /(?:href|xlink:href)\s*=\s*"([^"]+)"/g;
  let match;
  while ((match = re.exec(text))) {
    const value = match[1];
    if (!value.startsWith('data:') && !value.startsWith('#')) refs.push(value);
  }
  return refs;
}

function readNotes(project, count) {
  const dir = path.join(project, 'notes');
  if (!fs.existsSync(dir)) return Array(count).fill('');
  const files = fs.readdirSync(dir)
    .filter((name) => name.endsWith('.md') && !['total.md', 'readme.md'].includes(name.toLowerCase()))
    .sort();
  if (files.length === count) {
    return files.map((name) => fs.readFileSync(path.join(dir, name), 'utf8').trim());
  }
  return Array(count).fill('');
}

function themeVars(theme) {
  if (!theme) return '';
  const c = theme.colors || {};
  const ty = theme.typography || {};
  const sp = theme.spacing || {};
  return `:root {
  --theme-bg: ${c.background || '#F5F5F5'};
  --theme-surface: ${c.surface || '#FFFFFF'};
  --theme-text: ${c.text || '#111111'};
  --theme-text-muted: ${c.textMuted || '#666666'};
  --theme-primary: ${c.primary || '#2448E8'};
  --theme-accent: ${c.accent || '#2448E8'};
  --theme-text-accent: ${c.textAccent || c.accent || '#2448E8'};
  --theme-rule: ${c.rule || '#D0D0D0'};
  --theme-font-title: ${ty.title_stack || 'Inter, sans-serif'};
  --theme-font-body: ${ty.body_stack || 'PingFang SC, sans-serif'};
  --theme-margin: ${sp.margin || 64}px;
}`;
}

function buildHtml({ title, slides, notes, theme, themeName, lang = 'zh-CN' }) {
  const sections = slides.map((svg, index) => {
    const note = notes[index] || '';
    const notesHtml = note
      ? `<aside class="notes" aria-label="演讲备注">${escapeHtml(note)}</aside>`
      : '';
    return `<section class="slide" id="slide-${index + 1}" data-index="${index + 1}">${svg}${notesHtml}</section>`;
  }).join('\n');
  const notesCount = notes.filter(Boolean).length;
  const today = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const themeBadge = escapeHtml(themeName || 'Default');
  const titleEsc = escapeHtml(title);

  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titleEsc}</title>
<style>
  ${themeVars(theme)}
  :root {
    --chrome-bg: #111315;
    --chrome-text: #E8E6E1;
    --chrome-muted: #96938C;
    --chrome-line: #2A2D31;
    --chrome-accent: #C0503A;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; background: var(--chrome-bg); color: var(--chrome-text); }
  body { font-family: var(--theme-font-body, "PingFang SC", "Noto Sans SC", sans-serif); overflow: hidden; }
  .deck { height: 100%; display: grid; grid-template-rows: 1fr auto; }
  .stage { position: relative; display: grid; place-items: center; padding: 28px 72px 12px; min-height: 0; }
  .slide {
    display: none;
    width: min(100%, calc((100vh - 150px) * 16 / 9));
    aspect-ratio: 16 / 9;
    background: var(--theme-bg, #F5F5F5);
    box-shadow: 0 20px 60px rgba(0,0,0,.45);
    border: 1px solid rgba(255,255,255,.06);
    overflow: hidden;
  }
  .slide.active { display: block; }
  .deck-svg { display: block; width: 100%; height: 100%; }
  .slide .notes { display: none; }
  .nav {
    position: absolute; top: 50%; transform: translateY(-50%);
    width: 40px; height: 64px; border: 1px solid var(--chrome-line);
    background: rgba(20,22,24,.82); color: var(--chrome-text);
    font-size: 20px; cursor: pointer; border-radius: 8px;
  }
  .nav:hover { border-color: var(--chrome-accent); color: var(--chrome-accent); }
  .nav.prev { left: 18px; }
  .nav.next { right: 18px; }
  .hud {
    display: flex; align-items: center; justify-content: space-between; gap: 16px;
    padding: 10px 24px 14px; border-top: 1px solid var(--chrome-line);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: var(--chrome-muted);
  }
  .hud strong { color: var(--chrome-text); font-weight: 600; }
  .hud .left { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .hud .title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 52vw; }
  .hud .right { display: flex; align-items: center; gap: 14px; white-space: nowrap; }
  .hud button {
    appearance: none; border: 1px solid var(--chrome-line); background: transparent;
    color: var(--chrome-muted); font: inherit; padding: 4px 9px; border-radius: 4px; cursor: pointer;
  }
  .hud button:hover { color: var(--chrome-accent); border-color: var(--chrome-accent); }
  .progress { position: fixed; left: 0; bottom: 0; height: 2px; background: var(--chrome-accent); width: 0; z-index: 50; }
  .overview { position: fixed; inset: 0; z-index: 100; display: none; background: rgba(12,13,15,.94); padding: 32px; overflow: auto; }
  .overview.open { display: block; }
  .overview h2 { margin: 0 0 18px; font-size: 16px; font-weight: 500; color: var(--chrome-muted); }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
  .thumb { border: 1px solid var(--chrome-line); background: var(--theme-bg, #F5F5F5); aspect-ratio: 16 / 9; overflow: hidden; cursor: pointer; padding: 0; }
  .thumb:hover { border-color: var(--chrome-accent); }
  .thumb svg { width: 100%; height: 100%; display: block; }
  .notes-panel {
    position: fixed; right: 18px; bottom: 64px; width: min(420px, 40vw); max-height: 46vh;
    overflow: auto; display: none; z-index: 80; background: #1B1E22; border: 1px solid var(--chrome-line);
    border-radius: 8px; padding: 14px 16px; font-size: 13px; line-height: 1.6; white-space: pre-wrap;
  }
  .notes-panel.open { display: block; }
  @media print {
    html, body { overflow: visible; background: #FFFFFF; }
    .deck, .stage { display: block; padding: 0; height: auto; }
    .slide { display: block !important; width: 100%; aspect-ratio: auto; box-shadow: none; border: 0; page-break-after: always; }
    .nav, .hud, .progress, .overview, .notes-panel { display: none !important; }
  }
</style>
</head>
<body>
<div class="deck">
  <main class="stage" id="stage">
    ${sections}
    <button class="nav prev" id="prev" aria-label="上一页">‹</button>
    <button class="nav next" id="next" aria-label="下一页">›</button>
  </main>
  <footer class="hud">
    <div class="left">
      <strong>${titleEsc}</strong>
      <span class="title">主题：${themeBadge}</span>
    </div>
    <div class="right">
      <span id="counter">1 / ${slides.length}</span>
      <button id="overviewBtn">总览 O</button>
      <button id="notesBtn"${notesCount ? '' : ' disabled'}>备注 N</button>
      <button id="printBtn">打印 P</button>
    </div>
  </footer>
</div>
<div class="progress" id="progress"></div>
<div class="overview" id="overview">
  <h2>总览 · ${titleEsc} · ${slides.length} 页 · 生成于 ${today}</h2>
  <div class="grid" id="grid"></div>
</div>
<div class="notes-panel" id="notesPanel"></div>
<script>
(() => {
  var slides = Array.from(document.querySelectorAll('.slide'));
  var total = slides.length;
  var index = 1;
  var overviewOpen = false;
  var counter = document.getElementById('counter');
  var progress = document.getElementById('progress');
  var overview = document.getElementById('overview');
  var grid = document.getElementById('grid');
  var notesPanel = document.getElementById('notesPanel');

  function notesFor(slide) {
    var note = slide.querySelector('.notes');
    return note ? note.textContent : '';
  }
  function render() {
    slides.forEach(function (slide, i) { slide.classList.toggle('active', i + 1 === index); });
    counter.textContent = index + ' / ' + total;
    progress.style.width = ((index / total) * 100) + '%';
    notesPanel.textContent = notesFor(slides[index - 1]) || '这一页没有备注。';
    if (location.hash !== '#page=' + index) history.replaceState(null, '', '#page=' + index);
  }
  function go(next) { index = Math.min(total, Math.max(1, next)); render(); }
  function buildOverview() {
    if (grid.dataset.built) return;
    slides.forEach(function (slide, i) {
      var button = document.createElement('button');
      button.className = 'thumb';
      button.title = '第 ' + (i + 1) + ' 页';
      button.appendChild(slide.querySelector('svg').cloneNode(true));
      button.addEventListener('click', function () { toggleOverview(false); go(i + 1); });
      grid.appendChild(button);
    });
    grid.dataset.built = '1';
  }
  function toggleOverview(force) {
    overviewOpen = typeof force === 'boolean' ? force : !overviewOpen;
    if (overviewOpen) buildOverview();
    overview.classList.toggle('open', overviewOpen);
  }
  document.getElementById('prev').addEventListener('click', function () { go(index - 1); });
  document.getElementById('next').addEventListener('click', function () { go(index + 1); });
  document.getElementById('overviewBtn').addEventListener('click', function () { toggleOverview(); });
  document.getElementById('notesBtn').addEventListener('click', function () { notesPanel.classList.toggle('open'); });
  document.getElementById('printBtn').addEventListener('click', function () { window.print(); });
  document.getElementById('stage').addEventListener('click', function (event) {
    if (event.target.closest('button')) return;
    var rect = event.currentTarget.getBoundingClientRect();
    go(event.clientX < rect.left + rect.width / 2 ? index - 1 : index + 1);
  });
  document.addEventListener('keydown', function (event) {
    var key = event.key;
    if (key === 'ArrowRight' || key === 'PageDown' || key === ' ') { event.preventDefault(); go(index + 1); }
    else if (key === 'ArrowLeft' || key === 'PageUp') { event.preventDefault(); go(index - 1); }
    else if (key === 'Home') { event.preventDefault(); go(1); }
    else if (key === 'End') { event.preventDefault(); go(total); }
    else if (key.toLowerCase() === 'o') { event.preventDefault(); toggleOverview(); }
    else if (key.toLowerCase() === 'n') { event.preventDefault(); notesPanel.classList.toggle('open'); }
    else if (key.toLowerCase() === 'p') { event.preventDefault(); window.print(); }
    else if (key === 'Escape') { toggleOverview(false); notesPanel.classList.remove('open'); }
  });
  var initial = (location.hash.match(/page=(\\d+)/) || [])[1];
  index = initial ? Math.min(total, Math.max(1, Number(initial))) : 1;
  render();
})();
</script>
</body>
</html>
`;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const project = path.resolve(args._[0] || '');
  if (!project || !fs.existsSync(project)) {
    console.error('Usage: svg-deck-to-html.mjs <project> [--out deck.html] [--theme tokens.json] [--theme-name name]');
    process.exit(1);
  }
  let source = path.join(project, 'svg_final');
  if (!fs.existsSync(source) || fs.readdirSync(source).filter((n) => n.endsWith('.svg')).length === 0) {
    source = path.join(project, 'svg_output');
  }
  const slides = fs.readdirSync(source).filter((n) => n.endsWith('.svg')).sort()
    .map((name) => stripSvg(fs.readFileSync(path.join(source, name), 'utf8')));
  if (!slides.length) {
    console.error(`No SVG pages under ${source}`);
    process.exit(1);
  }
  const external = slides.flatMap(externalRefs);
  if (external.length) {
    console.error('External SVG references are not allowed: ' + [...new Set(external)].slice(0, 10).join(', '));
    process.exit(1);
  }
  const theme = args.theme ? JSON.parse(fs.readFileSync(path.resolve(args.theme), 'utf8')) : null;
  const themeName = args['theme-name'] || (theme ? theme.name : '');
  const html = buildHtml({
    title: args.title || readTitle(project),
    slides,
    notes: readNotes(project, slides.length),
    theme,
    themeName,
    lang: readProjectLanguage(project),
  });
  const out = args.out
    ? path.resolve(args.out)
    : path.join(project, 'exports', `${path.basename(project)}_${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}.html`);
  fs.mkdirSync(path.dirname(out), { recursive: true });

  let finalHtml = html;
  if (!args['no-embed-fonts']) {
    const embedded = embedFonts(html);
    finalHtml = embedded.html;
    const { report } = embedded;
    if (report.changed) {
      console.log(`[OK] fonts embedded: ${report.embedded.join(', ')} (+${(report.bytes / 1024).toFixed(1)} KB)`);
      for (const item of report.substituted) console.log(`     substitute ${item.from} -> ${item.to}`);
    } else {
      console.log('[OK] no embeddable font in this deck; system stacks only');
    }
  }

  fs.writeFileSync(out, finalHtml, 'utf8');
  console.log(`[OK] ${slides.length} slide(s) -> ${out}`);
  console.log(`[OK] ${(Buffer.byteLength(finalHtml) / 1024).toFixed(1)} KB`);
}

main();
