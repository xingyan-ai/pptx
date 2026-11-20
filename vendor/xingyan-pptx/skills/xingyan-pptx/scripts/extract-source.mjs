#!/usr/bin/env node
import { expandUserPath } from './lib/paths.mjs';
/**
 * Read a PDF / DOCX / PPTX / HTML / Markdown source into plain text.
 *
 *   node scripts/extract-source.mjs <input> --out <path>
 *   node scripts/extract-source.mjs <input> --project <project>
 *   node scripts/extract-source.mjs <input> --project <project> --json
 *
 * The text lands under <project>/sources/<name>.txt by default when --project is
 * given. Page markers (===== PAGE N =====) are kept for outlining.
 *
 * Never write an ad-hoc PDF parser in the conversation: this wrapper resolves a
 * Python runtime with pypdf / pymupdf / pdfplumber and runs extract_source.py.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { pythonCandidates, pythonEnv } from './lib/python-runtime.mjs';
import { parseJsonText } from './lib/json.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, 'extract_source.py');
const ROOT = path.resolve(HERE, '..');
const ENGINE_PDF = path.join(ROOT, 'runtime', 'engine', 'scripts', 'source_to_md', 'pdf_to_md.py');

const args = { _: [] };
for (let i = 2; i < process.argv.length; i += 1) {
  const item = process.argv[i];
  if (!item.startsWith('--')) { args._.push(item); continue; }
  const key = item.slice(2);
  const next = process.argv[i + 1];
  if (next && !next.startsWith('--')) { args[key] = next; i += 1; }
  else args[key] = true;
}

const allowAgpl = Boolean(args['allow-agpl']) || process.env.CLAWHIVE_ALLOW_AGPL === '1';

const input = args._[0];
if (!input) {
  console.error(
    'Usage: node scripts/extract-source.mjs <input> [--out <path>] [--project <project>] [--python <path>] [--json] [--max-chars N] [--install]\n'
    + '       Commercial-safe default: pypdf (BSD-3). PyMuPDF is AGPL-3.0 and is backend-only:\n'
    + "       pass --allow-agpl to enable the engine's pdf_to_md.py path."
  );
  process.exit(1);
}

const source = path.resolve(input);
if (!fs.existsSync(source)) {
  console.error(`[ERR] 找不到输入文件：${source}`);
  process.exit(1);
}

const suffix = path.extname(source).toLowerCase();
const kind = suffix.replace('.', '');
const project = args.project ? path.resolve(expandUserPath(args.project)) : null;
const out = args.out
  ? path.resolve(expandUserPath(args.out))
  : project
    ? path.join(project, 'sources', `${path.basename(source, suffix)}.txt`)
    : null;
if (!out) {
  console.error('[ERR] 需要 --out <path> 或 --project <project>，否则不知道文本写到哪。');
  process.exit(1);
}

function candidates() {
  return pythonCandidates([
    args.python,
    process.env.CLAWHIVE_SOURCE_PYTHON,
    project ? path.join(project, '.venv-pptx', 'bin', 'python') : null,
    project ? path.join(project, '.venv-sources', 'bin', 'python') : null,
    project ? path.join(project, '.venv-pptx', 'Scripts', 'python.exe') : null,
    project ? path.join(project, '.venv-sources', 'Scripts', 'python.exe') : null,
  ].filter(Boolean));
}

const probes = {
  pdf: 'import pypdf',
  pdfAlt: 'import fitz',
  pdfAlt2: 'import pdfplumber',
  pptx: 'import pptx',
  any: 'import sys',
};

const probe = (python, code) => spawnSync(python, ['-c', code], { stdio: 'ignore', windowsHide: true, env: pythonEnv() }).status === 0;

function resolvePython() {
  const list = candidates();
  const has = (candidate, code) => (candidate.includes('/') ? fs.existsSync(candidate) : true) && probe(candidate, code);
  if (kind === 'pdf') {
    const pdfProbes = allowAgpl ? [probes.pdf, probes.pdfAlt2, probes.pdfAlt] : [probes.pdf, probes.pdfAlt2];
    for (const code of pdfProbes) {
      for (const candidate of list) if (has(candidate, code)) return { python: candidate, code };
    }
  } else if (kind === 'pptx') {
    for (const candidate of list) if (has(candidate, probes.pptx)) return { python: candidate, code: probes.pptx };
    // extract_source.py has a stdlib PPTX fallback.
    for (const candidate of list) if (has(candidate, probes.any)) return { python: candidate, code: probes.any };
  } else {
    for (const candidate of list) if (has(candidate, probes.any)) return { python: candidate, code: probes.any };
  }
  return null;
}


function printReport(report) {
  if (args.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    return;
  }
  console.log(`[source] kind=${report.kind} engine=${report.engine} pages=${report.pages} chars=${report.chars}`);
  if (report.emptyPages && report.emptyPages.length) {
    console.log(`[source] 空页：${report.emptyPages.join(', ')}（可能是纯图页，正文需另读）`);
  }
  console.log(`[out] ${report.out}`);
}

// Prefer the engine's structure-aware PDF converter (PyMuPDF) when a runtime
// can load it. It infers headings from font sizes, extracts tables, removes
// repeated headers/footers and writes Markdown with <!-- Page N --> markers.
// The app's bundled hardened Python cannot load PyMuPDF; the pypdf fallback
// below still works there.
function resolvePyMuPDF() {
  for (const candidate of candidates()) {
    if (candidate.includes('/') && !fs.existsSync(candidate)) continue;
    if (probe(candidate, 'import fitz')) return candidate;
  }
  return null;
}

if (kind === 'pdf' && fs.existsSync(ENGINE_PDF) && allowAgpl) {
  console.error('[warn] PyMuPDF 是 AGPL-3.0：这条路径仅限后端/自托管，分发给客户的客户端不要启用。');
  const enginePython = resolvePyMuPDF();
  if (enginePython) {
    const engine = spawnSync(enginePython, [ENGINE_PDF, source, '-o', out, '--images', 'none'], {
      encoding: 'utf8',
      windowsHide: true,
      env: pythonEnv({ PYTHONPATH: path.dirname(ENGINE_PDF) }),
    });
    if (engine.status === 0 && fs.existsSync(out)) {
      const text = fs.readFileSync(out, 'utf8');
      const markers = (text.match(/<!--\s*Page\s+\d+\s*-->/g) || []).length;
      const report = {
        ok: true,
        source,
        kind: 'pdf',
        engine: 'pymupdf+pdf_to_md',
        pages: markers + (text.trimStart().startsWith('<!-- Page') ? 0 : 1),
        chars: text.length,
        emptyPages: [],
        out,
      };
      printReport(report);
      process.exit(0);
    }
    if (engine.stderr) process.stderr.write(engine.stderr.split('\n').slice(-5).join('\n') + '\n');
    console.error('[warn] PyMuPDF 结构转换失败，回退 pypdf 纯文本。');
  }
}

let resolved = resolvePython();

if (!resolved && kind === 'pdf' && args.install) {
  const fallback = candidates().find((candidate) => (candidate.includes('/') ? fs.existsSync(candidate) : true));
  if (fallback) {
    console.error(`[info] 没有 PDF 库，尝试安装 pypdf 到 ${fallback} ...`);
    spawnSync(fallback, ['-m', 'pip', 'install', '--quiet', 'pypdf'], { stdio: 'inherit', windowsHide: true, env: pythonEnv() });
    resolved = resolvePython();
  }
}

if (!resolved) {
  if (kind === 'pdf') {
    console.error('[ERR] 没有找到带 pypdf / pymupdf / pdfplumber 的 Python。');
    console.error('      安装其中任意一个即可，例如：python3 -m pip install pypdf');
    console.error('      或用 --python 指定一个已安装的 Python，或加 --install 让脚本尝试安装 pypdf。');
  } else {
    console.error('[ERR] 没有找到可用的 Python 3。');
  }
  process.exit(2);
}

const pyArgs = [SCRIPT, source, '--out', out, '--json'];
if (args['max-chars']) pyArgs.push('--max-chars', String(args['max-chars']));
if (allowAgpl) pyArgs.push('--allow-agpl');

const result = spawnSync(resolved.python, pyArgs, { encoding: 'utf8', windowsHide: true, env: pythonEnv() });
if (result.error) {
  console.error(`[ERR] 运行 Python 失败：${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) {
  process.stderr.write(result.stderr || '');
  process.stderr.write(result.stdout || '');
  process.exit(result.status || 1);
}

let report = null;
try {
  const lines = String(result.stdout || '').trim().split('\n');
  report = parseJsonText((lines.filter((line) => line.trim()).pop() || '').trim());
} catch {
  console.error('[ERR] 提取脚本返回了无法解析的输出：');
  process.stderr.write(result.stdout || '');
  process.exit(1);
}

if (!report.ok) {
  console.error(`[ERR] ${report.error || '提取失败'}`);
  process.exit(1);
}

printReport(report);
