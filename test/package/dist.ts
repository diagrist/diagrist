import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

/** Relative imports and re-exports in built JavaScript and declarations: `from "./x.js"`, `import("./x.js")`. */
const RELATIVE = /(?:from\s*|import\s*\(\s*)["'](\.{1,2}\/[^"']+)["']/g;

/**
 * Files in a package's `dist` that the current build did not write, such as source maps of a build when they were on
 * or chunks of an entry that is gone. What the build writes is what the promised files reach: the entries and bins of
 * package.json, the chunks and declarations they import, and the declaration beside every reached script, which
 * tsdown writes for an entry even when no export names it; an import of a chunk that holds only types names its
 * `.js` while only the `.d.ts` exists. Paths are relative to the package.
 */
export function staleFiles(dir: string, promised: readonly string[]): string[] {
  const dist = join(dir, 'dist');
  if (!existsSync(dist)) return [];
  const reached = new Set<string>();
  const visit = (path: string): void => {
    const file = existsSync(path) ? path : path.replace(/\.js$/, '.d.ts');
    if (reached.has(file) || !existsSync(file)) return;
    reached.add(file);
    if (file.endsWith('.js')) visit(file.replace(/\.js$/, '.d.ts'));
    for (const match of readFileSync(file, 'utf8').matchAll(RELATIVE)) visit(join(dirname(file), match[1] ?? ''));
  };
  for (const path of promised) visit(join(dir, path));
  return readdirSync(dist, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .filter((file) => !reached.has(file))
    .map((file) => relative(dir, file))
    .sort();
}
