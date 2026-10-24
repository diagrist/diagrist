import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lineOf, nodes, parse, repository, sourceFiles } from './source.js';

/**
 * Package boundaries are derived from each package.json (ADR 0004): a package may import another Diagrist
 * package only if it declares it as a dependency. Plugins never depend on other plugins, and relative imports
 * never leave their package.
 */
describe('package boundaries', () => {
  const files = sourceFiles().filter((file) => packageOf(file) !== undefined);

  it('import only declared Diagrist packages and stay inside their package', () => {
    const offending = files.flatMap((file) => {
      const root = packageOf(file) as string;
      const declared = declaredDependencies(root, file.includes('/test/'));
      const { source, program } = parse(file);
      return [...nodes(program)]
        .filter(
          (node) =>
            node.type === 'ImportDeclaration' ||
            node.type === 'ExportNamedDeclaration' ||
            node.type === 'ExportAllDeclaration',
        )
        .map((node) => ({ node, from: (node.source as { value?: string } | null)?.value }))
        .filter((entry): entry is { node: typeof entry.node; from: string } => typeof entry.from === 'string')
        .filter(({ from }) => violates(from, file, root, declared))
        .map(({ node, from }) => `${file}:${lineOf(source, node.start)}  ${from}`);
    });
    expect(offending).toEqual([]);
  });

  it('keep plugins independent of each other', () => {
    const plugins = files.map(packageOf).filter((root): root is string => root?.startsWith('plugins/') === true);
    const offending = [...new Set(plugins)].flatMap((root) =>
      declaredDependencies(root, true)
        .filter((name) => name.startsWith('@diagrist/plugin-'))
        .map((name) => `${root} depends on ${name}`),
    );
    expect(offending).toEqual([]);
  });
});

function packageOf(file: string): string | undefined {
  return /^(packages|plugins)\/[^/]+/.exec(file)?.[0];
}

function declaredDependencies(root: string, includeDev: boolean): string[] {
  const manifest = join(repository, root, 'package.json');
  if (!existsSync(manifest)) return [];
  const json = JSON.parse(readFileSync(manifest, 'utf8')) as Record<string, Record<string, string> | undefined>;
  const groups = ['dependencies', 'peerDependencies', ...(includeDev ? ['devDependencies'] : [])];
  return groups.flatMap((group) => Object.keys(json[group] ?? {}));
}

function violates(from: string, file: string, root: string, declared: string[]): boolean {
  if (from.startsWith('.')) return !join(file, '..', from).startsWith(`${root}/`);
  if (!from.startsWith('@diagrist/')) return false;
  const name = from.split('/').slice(0, 2).join('/');
  return !declared.includes(name);
}
