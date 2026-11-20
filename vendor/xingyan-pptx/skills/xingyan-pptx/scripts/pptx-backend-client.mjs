#!/usr/bin/env node
/**
 * PPTX backend client.
 *
 * Usage:
 *   node scripts/pptx-backend-client.mjs <project> \
 *     --endpoint https://example.com/v1/decks/pptx \
 *     --token "$DECK_STUDIO_TOKEN"
 *
 * The client sends self-contained SVG pages. The backend owns the engine
 * runtime and returns a native PPTX. No Python, PyMuPDF, or ebooklib ships in
 * the desktop client.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readProjectLanguage } from './lib/language.mjs';

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

function readSelection(project) {
  const file = path.join(project, 'theme_selection.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readPages(project, lang) {
  let source = path.join(project, 'svg_final');
  if (!fs.existsSync(source) || fs.readdirSync(source).filter((n) => n.endsWith('.svg')).length === 0) {
    source = path.join(project, 'svg_output');
  }
  return fs.readdirSync(source)
    .filter((name) => name.endsWith('.svg'))
    .sort()
    .map((name) => {
      const raw = fs.readFileSync(path.join(source, name), 'utf8');
      const svg = /<svg\b[^>]*\blang=/.test(raw)
        ? raw
        : raw.replace(/<svg\b/, `<svg lang="${lang}"`);
      return {
        id: path.basename(name, '.svg'),
        svg,
      };
    });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options, attempts = 2) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429 || response.status >= 500) {
        if (i + 1 < attempts) {
          await sleep(1000 * (i + 1));
          continue;
        }
      }
      return response;
    } catch (error) {
      lastError = error;
      if (i + 1 < attempts) await sleep(1000 * (i + 1));
    }
  }
  throw lastError;
}

async function saveResponse(response, out) {
  const type = response.headers.get('content-type') || '';
  if (type.includes('presentationml') || type.includes('octet-stream')) {
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buffer);
    return out;
  }
  const payload = await response.json();
  if (payload.downloadUrl) {
    const download = await fetchWithRetry(payload.downloadUrl, { method: 'GET' });
    if (!download.ok) throw new Error(`download failed: ${download.status}`);
    const buffer = Buffer.from(await download.arrayBuffer());
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buffer);
    return out;
  }
  if (payload.jobId && payload.statusUrl) {
    const deadline = Date.now() + 5 * 60 * 1000;
    while (Date.now() < deadline) {
      await sleep(2000);
      const statusResponse = await fetchWithRetry(payload.statusUrl, { method: 'GET' });
      const status = await statusResponse.json();
      if (status.status === 'succeeded' && status.downloadUrl) {
        const download = await fetchWithRetry(status.downloadUrl, { method: 'GET' });
        const buffer = Buffer.from(await download.arrayBuffer());
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, buffer);
        return out;
      }
      if (status.status === 'failed') throw new Error(`backend job failed: ${status.error || 'unknown'}`);
    }
    throw new Error('backend job timed out');
  }
  throw new Error(`unexpected backend response: ${JSON.stringify(payload).slice(0, 500)}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const project = path.resolve(args._[0] || '');
  if (!project || !fs.existsSync(project)) {
    console.error('Usage: pptx-backend-client.mjs <project> --endpoint URL [--token TOKEN] [--out file.pptx] [--dry-run]');
    process.exit(1);
  }
  const endpoint = args.endpoint || process.env.DECK_STUDIO_PPTX_ENDPOINT;
  const token = args.token || process.env.DECK_STUDIO_TOKEN || '';
  if (!endpoint && !args['dry-run']) {
    console.error('Missing --endpoint or DECK_STUDIO_PPTX_ENDPOINT');
    process.exit(1);
  }

  const lang = readProjectLanguage(project);
  const pages = readPages(project, lang);
  if (!pages.length) {
    console.error('No SVG pages found.');
    process.exit(1);
  }
  const selection = readSelection(project);
  const payload = {
    schemaVersion: 1,
    deck: {
      title: readTitle(project),
      themeId: selection?.selectedTheme || null,
      language: lang,
      canvas: { width: 1280, height: 720 },
    },
    pages,
    options: {
      speakerNotes: Boolean(args['speaker-notes']),
      nativeCharts: Boolean(args['native-charts']),
    },
  };
  const body = JSON.stringify(payload);
  const sizeMb = Buffer.byteLength(body) / 1024 / 1024;
  console.log(`[INFO] ${pages.length} page(s), payload ${sizeMb.toFixed(2)} MB`);
  if (sizeMb > 20) {
    console.error('Payload exceeds 20 MB; compress images or split the deck.');
    process.exit(1);
  }

  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
  const out = path.resolve(args.out || path.join(project, 'exports', `${path.basename(project)}_${stamp}.pptx`));

  if (args['dry-run']) {
    const dry = out.replace(/\.pptx$/, '.payload.json');
    fs.mkdirSync(path.dirname(dry), { recursive: true });
    fs.writeFileSync(dry, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`[OK] dry-run payload -> ${dry}`);
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Idempotency-Key': `deck-${createHash('sha256').update(payload.deck.title + stamp).digest('hex').slice(0, 32)}`,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetchWithRetry(endpoint, { method: 'POST', headers, body });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[ERROR] backend ${response.status}: ${text.slice(0, 2000)}`);
    process.exit(1);
  }

  const saved = await saveResponse(response, out);
  console.log(`[OK] PPTX -> ${saved}`);
}

main().catch((error) => {
  console.error(`[ERROR] ${error.message}`);
  process.exit(1);
});
