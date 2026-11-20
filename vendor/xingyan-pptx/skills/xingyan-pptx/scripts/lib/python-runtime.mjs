/**
 * Locate a Python interpreter that can import the export dependencies.
 *
 * ClawHive injects `CLAWHIVE_PYTHON_EXECUTABLE` into skill subprocesses and
 * installs the managed runtime at different layouts per platform:
 *
 *   Windows  <userData>/runtimes/python-win/python.exe      (embedded dist)
 *   macOS    <userData>/runtimes/python/<target>/envs/default/bin/python3
 *   Harness  ~/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python
 *
 * Older builds also shipped `runtimes/python/<win-x64|mac-x64|linux-x64>`, so
 * that layout stays as a fallback instead of being dropped.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

/** Default import set for SVG → PPTX export. PyYAML is optional for the engine. */
export const PPTX_PROBE = 'import pptx, PIL, lxml';

const isWin = () => process.platform === 'win32';

/**
 * Environment for every Python child process. UTF-8 stdio keeps Windows from
 * using the ANSI code page (cp936) on piped output; NOUSERSITE avoids mixing
 * user site-packages into the managed runtime; DONTWRITEBYTECODE keeps
 * __pycache__ out of the read-only skill directory.
 */
export function pythonEnv(extra = {}) {
  return {
    ...process.env,
    PYTHONUTF8: '1',
    PYTHONIOENCODING: 'utf-8',
    PYTHONNOUSERSITE: '1',
    PYTHONDONTWRITEBYTECODE: '1',
    ...extra,
  };
}

function userRuntimeRoot() {
  const home = os.homedir();
  return process.platform === 'darwin'
    ? path.join(home, 'Library', 'Application Support', 'ClawHiveApp', 'runtimes')
    : path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'ClawHiveApp', 'runtimes');
}

function exeName(...names) {
  return isWin() ? names[names.length - 1] : names[0];
}

/** Managed runtimes: current Windows embed, legacy per-target trees, and the Harness payload. */
export function runtimeCandidates() {
  const root = userRuntimeRoot();
  const found = [];

  if (isWin()) {
    found.push(path.join(root, 'python-win', 'python.exe'));
    found.push(path.join(root, 'python-win', 'Scripts', 'python.exe'));
  } else {
    const target = process.arch === 'arm64' ? 'mac-arm64' : 'mac-x64';
    found.push(path.join(root, 'python', target, 'envs', 'default', 'bin', 'python3'));
    found.push(path.join(root, 'python', target, 'envs', 'default', 'bin', 'python'));
  }

  for (const target of ['mac-arm64', 'mac-x64', 'win-x64', 'linux-x64']) {
    const base = path.join(root, 'python', target);
    found.push(path.join(base, 'envs', 'default', 'bin', 'python3'));
    found.push(path.join(base, 'envs', 'default', 'bin', 'python'));
    found.push(path.join(base, 'envs', 'default', 'Scripts', 'python.exe'));
    let entries = [];
    try { entries = fs.readdirSync(base); } catch { /* not installed */ }
    for (const version of entries) {
      if (!/^\d/.test(version)) continue;
      found.push(path.join(base, version, 'runtime', 'python', 'bin', 'python3'));
      found.push(path.join(base, version, 'runtime', 'python', 'python.exe'));
    }
  }

  for (const target of ['win-x64', 'mac-arm64', 'mac-x64', 'linux-x64']) {
    found.push(path.join(root, 'python', target, 'python.exe'));
  }

  const dsh = path.join(os.homedir(), '.dsh', 'dsh-runtimes', 'dsh-primary-runtime', 'dependencies', 'python');
  found.push(path.join(dsh, exeName('bin/python3', 'python.exe')));
  found.push(path.join(dsh, 'python.exe'));

  return found;
}

/** Path candidates plus bare names, in priority order. */
export function pythonCandidates(extra = []) {
  const home = os.homedir();
  return [
    ...extra,
    process.env.CLAWHIVE_PPTX_PYTHON,
    process.env.CLAWHIVE_PYTHON_EXECUTABLE,
    ...runtimeCandidates(),
    path.join(home, '.venv-pptx', 'bin', 'python'),
    path.join(home, '.venv-pptx', 'Scripts', 'python.exe'),
    'python',
    'python3.12',
    'python3',
  ].filter((value) => typeof value === 'string' && value.length > 0);
}

/**
 * Return the first candidate that exists (when it is a path) and can import
 * everything in `probeCode`, or `null` when none qualify.
 */
export function resolvePython({ extra = [], probeCode = PPTX_PROBE } = {}) {
  for (const candidate of pythonCandidates(extra)) {
    const isPath = candidate.includes('/') || candidate.includes('\\');
    if (isPath && !fs.existsSync(candidate)) continue;
    const probe = spawnSync(candidate, ['-c', probeCode], { stdio: 'ignore', windowsHide: true, env: pythonEnv() });
    if (probe.status === 0) return candidate;
  }
  return null;
}
