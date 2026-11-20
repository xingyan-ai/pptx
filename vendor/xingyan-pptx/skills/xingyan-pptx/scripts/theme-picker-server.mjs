#!/usr/bin/env node
import { expandUserPath } from './lib/paths.mjs';
/**
 * Local theme picker for Stage 1.
 *
 * Usage:
 *   node scripts/theme-picker-server.mjs --project /path/to/project --port 5055
 *
 * Serve the 38-theme gallery, accept POST /select, and write
 * <project>/theme_selection.json. The page is local-only and binds to 127.0.0.1.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const TOKENS_DIR = path.join(ROOT, 'themes', 'tokens');

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

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const relative = decoded === '/' ? 'theme-gallery.html' : decoded.replace(/^\/+/, '');
  const resolved = path.resolve(ROOT, relative);
  if (!resolved.startsWith(ROOT + path.sep) && resolved !== path.join(ROOT, 'theme-gallery.html')) {
    return null;
  }
  return resolved;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const project = args.project ? path.resolve(expandUserPath(args.project)) : '';
  if (!project) {
    console.error('Usage: theme-picker-server.mjs --project <project-dir> [--port 5055]');
    process.exit(1);
  }
  fs.mkdirSync(project, { recursive: true });
  const selectionPath = path.join(project, 'theme_selection.json');
  const port = Number(args.port || 5055);
  const host = args.host || '127.0.0.1';

  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/select') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 1_000_000) req.destroy();
      });
      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          const theme = String(payload.theme || '');
          if (!fs.existsSync(path.join(TOKENS_DIR, `${theme}.json`))) {
            send(res, 400, JSON.stringify({ ok: false, error: 'unknown theme' }), MIME['.json']);
            return;
          }
          const selectScript = path.join(HERE, 'theme-select.mjs');
          execFileSync(process.execPath, [selectScript, 'choose', '--theme', theme, '--source', 'user', '--out', selectionPath], {
            stdio: 'ignore',
            windowsHide: true,
          });
          send(
            res,
            200,
            JSON.stringify({ ok: true, theme, selectionPath }),
            MIME['.json'],
          );
        } catch (error) {
          send(res, 500, JSON.stringify({ ok: false, error: error.message }), MIME['.json']);
        }
      });
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(res, 405, 'Method not allowed');
      return;
    }

    const file = safePath(req.url || '/');
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      send(res, 404, 'Not found');
      return;
    }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    if (req.method === 'HEAD') {
      res.end();
    } else {
      fs.createReadStream(file).pipe(res);
    }
  });

  server.listen(port, host, () => {
    console.log(`[OK] Theme picker: http://${host}:${port}/`);
    console.log(`[OK] Selection will be written to: ${selectionPath}`);
  });
}

main();
