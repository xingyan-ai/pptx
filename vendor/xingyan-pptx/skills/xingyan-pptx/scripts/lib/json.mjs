/**
 * Read JSON that may have been written by a Windows tool.
 *
 * Windows editors and shells produce UTF-8 with BOM, UTF-16LE/BE with BOM, or
 * (when a file is "saved as ANSI") GB18030. `JSON.parse` rejects the BOM, and
 * decoding UTF-16 as UTF-8 yields garbage. Every package JSON entry point goes
 * through here so a hand-edited outline.json cannot silently break the gates.
 */

import fs from 'node:fs';

export function decodeText(buffer) {
  if (buffer.length >= 2) {
    if (buffer[0] === 0xff && buffer[1] === 0xfe) return buffer.subarray(2).toString('utf16le');
    if (buffer[0] === 0xfe && buffer[1] === 0xff) {
      const body = Buffer.from(buffer.subarray(2));
      body.swap16();
      return body.toString('utf16le');
    }
  }
  let text = buffer.toString('utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return text;
}

/** Strip a leading BOM from an already-decoded string. */
export function stripBom(text) {
  return typeof text === 'string' && text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Parse JSON text that may start with a BOM. */
export function parseJsonText(text) {
  return JSON.parse(stripBom(text));
}

/** Read and parse a JSON file, tolerating BOM and UTF-16 encodings. */
export function readJsonFile(file) {
  return parseJsonText(decodeText(fs.readFileSync(file)));
}
