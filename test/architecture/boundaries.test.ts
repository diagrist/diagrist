import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lineOf, manifest, nodes, packageOf, parse, sourceFiles } from './source.js';

/**
 * Package boundaries are derived from each package.json (ADR 0004): a package may import another Diagrist
 * package only if it declares it as a dependency. Plugins never depend on other plugins, and relative imports
 * never leave their package. The one exception is a package's build config, which spreads the shared one at the
 * root so that every way of building writes the same files.
 */
describe('package boundaries', () => {
  const files = sourceFiles().filter((file) => packageOf(file) !== undefined);
  const workspace = new Set(files.map((file) => manifest(packageOf(file) as string).name));

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
        .filter(({ from }) => violates(from, file, root, declared, workspace))
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

function declaredDependencies(root: string, includeDev: boolean): string[] {
  const { dependencies, peerDependencies, devDependencies } = manifest(root);
  return [dependencies, peerDependencies, includeDev ? devDependencies : undefined].flatMap((group) =>
    Object.keys(group ?? {}),
  );
}

const SHARED_BUILD_CONFIG = 'tsdown.config.ts';

/** Whether an import leaves its package, or reaches a workspace package (`@diagrist/*` or `diagrist`) undeclared. */
function violates(
  from: string,
  file: string,
  root: string,
  declared: string[],
  workspace: ReadonlySet<string | undefined>,
): boolean {
  const target = join(file, '..', from);
  if (file === `${root}/${SHARED_BUILD_CONFIG}` && target === SHARED_BUILD_CONFIG) return false;
  if (from.startsWith('.')) return !target.startsWith(`${root}/`);
  const name = from
    .split('/')
    .slice(0, from.startsWith('@') ? 2 : 1)
    .join('/');
  return workspace.has(name) && !declared.includes(name);
}
