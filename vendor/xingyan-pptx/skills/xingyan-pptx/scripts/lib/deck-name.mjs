import { readJsonFile } from './json.mjs';
/**
 * Derive a human-readable export file name from the deck itself.
 *
 * Precedence: outline.contract.projectName -> cover slide title -> the
 * project-title page -> the directory name. The result is stripped of path and
 * shell-hostile characters so it is safe on macOS, Windows and Linux.
 */

import fs from 'node:fs';
import path from 'node:path';

const MAX_LENGTH = 48;

function readOutline(project) {
  const file = path.join(project, 'outline.json');
  if (!fs.existsSync(file)) return null;
  try { return readJsonFile(file); } catch { return null; }
}

export function sanitizeName(raw) {
  const cleaned = String(raw || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .slice(0, MAX_LENGTH)
    .replace(/[. ]+$/, '')
    .trim();
  return cleaned || '';
}

export function deckBaseName(project) {
  const outline = readOutline(project);
  const slides = Array.isArray(outline?.slides) ? outline.slides : [];
  const cover = slides.find((slide) => slide?.role === 'cover');
  const titlePage = slides.find((slide) => slide?.role === 'section' && /title|项目名|project/i.test(String(slide.id || '')));
  for (const candidate of [outline?.contract?.projectName, cover?.title, titlePage?.title]) {
    const name = sanitizeName(candidate);
    if (name) return name;
  }
  return sanitizeName(path.basename(project)) || 'deck';
}

export function fileStamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

/** `<base>_<stamp>.<ext>` under `<project>/exports/`. */
export function exportFileName(project, ext, date = new Date()) {
  return path.join(project, 'exports', `${deckBaseName(project)}_${fileStamp(date)}.${ext}`);
}
