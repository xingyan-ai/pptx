/**
 * Expand a leading `~` before handing a path to the filesystem.
 *
 * Node does not expand the home shortcut, so an argument written as the
 * shortcut plus a path silently creates a directory literally named "~" in the
 * current working directory. The agent and users type that form on macOS and
 * Windows shells, so every entry point runs its path argument through here.
 */

import os from 'node:os';
import path from 'node:path';

const HOME_SHORTCUT = '~';
const SEPARATORS = [path.posix.sep, path.win32.sep];

export function expandUserPath(value) {
  if (typeof value !== 'string' || !value) return value;
  if (value === HOME_SHORTCUT) return os.homedir();
  if (SEPARATORS.some((sep) => value.startsWith(HOME_SHORTCUT + sep))) {
    return path.join(os.homedir(), value.slice(2));
  }
  return value;
}
