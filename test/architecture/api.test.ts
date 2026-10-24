import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lineOf, manifest, type Node, nodes, packageOf, parse, repository, sourceFiles, statements } from './source.js';

/**
 * The public API of a package is what its package.json exports, listed name by name, and every name in it is
 * documented (docs/engineering.md, "Small public API"). The entries are read from `exports`, so a new subpath is
 * checked without being listed here. Each exported name is followed through re-exports to its declaration, which
 * needs a TSDoc block.
 */
describe('the public API', () => {
  it('is listed name by name: no `export *`', () => {
    const offending = sourceFiles()
      .filter((file) => packageOf(file) !== undefined && file.includes('/src/'))
      .flatMap((file) => {
        const { source, program } = parse(file);
        return [...nodes(program)]
          .filter((node) => node.type === 'ExportAllDeclaration')
          .map((node) => `${file}:${lineOf(source, node.start)}`);
      });
    expect(offending).toEqual([]);
  });

  it('documents every exported declaration with TSDoc', () => {
    const offending = entries().flatMap((entry) =>
      exportedNames(entry).flatMap(({ name, file }) => {
        const found = declarationOf(name, file, new Set());
        return found === undefined || found.documented ? [] : [`${found.file}:${found.line}  ${name}`];
      }),
    );
    expect([...new Set(offending)]).toEqual([]);
  });
});

/** Every source file a package exports, by its `@diagrist/source` condition, relative to the repository. */
function entries(): string[] {
  const roots = [...new Set(sourceFiles().map(packageOf))].filter((root) => root !== undefined);
  return roots.flatMap((root) =>
    Object.values(manifest(root).exports ?? {})
      .map((conditions) => conditions['@diagrist/source'])
      .filter((path) => path !== undefined)
      .map((path) => join(root, path)),
  );
}

interface Exported {
  readonly name: string;
  /** The file to look for the declaration in. */
  readonly file: string;
}

/** The names an entry exports, each with the file its declaration is to be found in. */
function exportedNames(file: string): Exported[] {
  const { program } = parse(file);
  return statements(program)
    .filter((node) => node.type === 'ExportNamedDeclaration')
    .flatMap((node) => {
      const from = (node.source as { value?: string } | null)?.value;
      const target = from === undefined ? file : resolveModule(file, from);
      if (target === undefined) return [];
      if (node.declaration) return declaredNames(node.declaration as Node).map((name) => ({ name, file }));
      return (node.specifiers as Node[]).map((specifier) => ({ name: nameOf(specifier.local), file: target }));
    });
}

/** Where `name` is declared, following re-exports, and whether a TSDoc block stands right before it. */
function declarationOf(
  name: string,
  file: string,
  seen: Set<string>,
): { file: string; line: number; documented: boolean } | undefined {
  if (seen.has(`${file}#${name}`)) return undefined;
  seen.add(`${file}#${name}`);
  const { source, program, comments } = parse(file);
  for (const node of statements(program)) {
    const declaration = node.type === 'ExportNamedDeclaration' ? (node.declaration as Node | null) : node;
    if (declaration && declaredNames(declaration).includes(name)) {
      const documented = comments.some(
        (comment) =>
          comment.type === 'Block' &&
          comment.value.startsWith('*') &&
          comment.end <= node.start &&
          source.slice(comment.end, node.start).trim() === '',
      );
      return { file, line: lineOf(source, node.start), documented };
    }
    const from = (node.source as { value?: string } | null | undefined)?.value;
    if (node.type !== 'ExportNamedDeclaration' || from === undefined) continue;
    const specifier = (node.specifiers as Node[]).find((s) => nameOf(s.exported) === name);
    const target = resolveModule(file, from);
    if (specifier && target) return declarationOf(nameOf(specifier.local), target, seen);
  }
  const imported = statements(program)
    .filter((node) => node.type === 'ImportDeclaration')
    .flatMap((node) =>
      (node.specifiers as Node[])
        .filter((s) => nameOf(s.local) === name && s.imported !== undefined)
        .map((s) => ({ name: nameOf(s.imported), from: (node.source as { value: string }).value })),
    )[0];
  const target = imported && resolveModule(file, imported.from);
  return imported && target ? declarationOf(imported.name, target, seen) : undefined;
}

function declaredNames(node: Node): string[] {
  if (node.type === 'VariableDeclaration') {
    return (node.declarations as Node[]).map((d) => (d.id as Node).name).filter((n): n is string => !!n);
  }
  const id = node.id as Node | null | undefined;
  return typeof id?.name === 'string' ? [id.name] : [];
}

function nameOf(node: unknown): string {
  const named = node as { name?: string; value?: string };
  return named.name ?? named.value ?? '';
}

/** A relative module as a source file of the repository; other packages are their own entries. */
function resolveModule(file: string, from: string): string | undefined {
  if (!from.startsWith('.')) return undefined;
  const path = join(file, '..', from).replace(/\.js$/, '.ts');
  return existsSync(join(repository, path)) ? path : undefined;
}
