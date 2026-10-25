/** Why a path written in a diagram may not be read: see `resolvePath`. */
export type PathProblem = 'absolute' | 'outside' | 'hidden';

/** A path a diagram may read, relative to the folder the host runs in, or why it may not. */
export type ResolvedPath = { readonly path: string } | { readonly problem: PathProblem };

/**
 * Where a path written in the file `from` points, for every file a diagram reads (`use` and the files of values).
 * `written` must be relative (`absolute` otherwise, which also covers schemes such as `https:` and backslashes),
 * may name no hidden file or folder such as `.env` or `.git` (`hidden`), and must stay inside the folder the host
 * runs in (`outside`). `from` is relative to that folder as the host names it; when it is absolute, the folder of
 * `from` is the limit. Pure string work, so every host draws the same line.
 */
export function resolvePath(from: string, written: string): ResolvedPath {
  if (written === '' || /^[/\\]/.test(written) || /^[A-Za-z][\w+.-]*:/.test(written) || written.includes('\\')) {
    return { problem: 'absolute' };
  }
  const parts = written.split('/');
  if (parts.some((part) => part.startsWith('.') && part !== '.' && part !== '..')) return { problem: 'hidden' };
  const absolute = from.startsWith('/');
  const folder = from
    .split('/')
    .slice(0, -1)
    .filter((part) => part !== '' && part !== '.');
  const floor = absolute ? folder.length : 0;
  const at = [...folder];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part !== '..') at.push(part);
    else if (at.length > floor && at.at(-1) !== '..') at.pop();
    else return { problem: 'outside' };
  }
  if (at[0] === '..') return { problem: 'outside' };
  return { path: `${absolute ? '/' : ''}${at.join('/')}` };
}
