import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lineOf, type Node, packageOf, parse, sourceFiles, statements } from './source.js';

/**
 * Imports inside a package. Shipped code never reaches into tests, whose fixtures and fakes would be bundled with
 * it. And no two modules of a package import each other's values in a circle: under ES modules one side then
 * meets the other's tables uninitialised, and the order of imports decides whether it works.
 */
describe('imports inside a package', () => {
  const files = sourceFiles().filter((file) => isIn('src', file));
  const graph = new Map(files.map((file) => [file, relativeImports(file)]));

  it('never lead from src into test', () => {
    const offending = files.flatMap((file) =>
      (graph.get(file) ?? [])
        .filter(({ target }) => isIn('test', target))
        .map(({ target, line }) => `${file}:${line}  ${target}`),
    );
    expect(offending).toEqual([]);
  });

  it('form no cycle of value imports', () => {
    const values = new Map(
      [...graph].map(([file, imports]) => [file, imports.filter((i) => i.value).map((i) => i.target)]),
    );
    expect(cycles(values)).toEqual([]);
  });
});

/**
 * Kinds of one plugin are built side by side and stay apart: a folder that holds a `kind.ts` is a kind, and nothing in
 * it imports from another kind's folder. A piece two kinds draw alike lives beside them, in a folder of its own such as
 * `src/shared`, so a change for one kind cannot break another unseen.
 */
describe('kinds of a plugin', () => {
  const files = sourceFiles().filter((file) => file.startsWith('plugins/') && isIn('src', file));
  const kinds = files.filter((file) => file.endsWith('/kind.ts')).map((file) => file.slice(0, -'kind.ts'.length));
  const kindOf = (file: string) => kinds.find((folder) => file.startsWith(folder));

  it('import nothing from each other', () => {
    const offending = files.flatMap((file) => {
      const own = kindOf(file);
      if (own === undefined) return [];
      return relativeImports(file)
        .filter(({ target }) => ![undefined, own].includes(kindOf(target)))
        .map(({ target, line }) => `${file}:${line}  ${target}`);
    });
    expect(offending).toEqual([]);
  });
});

/** Whether a file lies in the `src` or `test` folder of its package. */
function isIn(folder: 'src' | 'test', file: string): boolean {
  return file.startsWith(`${packageOf(file)}/${folder}/`);
}

interface Import {
  readonly target: string;
  readonly line: number;
  /** Whether the import brings in a value at run time; `import type` and `export type` vanish when compiled. */
  readonly value: boolean;
}

function relativeImports(file: string): Import[] {
  const { source, program } = parse(file);
  return statements(program)
    .filter((node) => ['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type))
    .flatMap((node) => {
      const from = (node.source as { value?: string } | null | undefined)?.value;
      if (from === undefined || !from.startsWith('.')) return [];
      const target = join(file, '..', from).replace(/\.js$/, '.ts');
      return [{ target, line: lineOf(source, node.start), value: bringsValue(node) }];
    });
}

function bringsValue(node: Node): boolean {
  if (node.importKind === 'type' || node.exportKind === 'type') return false;
  const specifiers = (node.specifiers ?? []) as Node[];
  if (specifiers.length === 0) return true;
  return specifiers.some((specifier) => specifier.importKind !== 'type' && specifier.exportKind !== 'type');
}

/**
 * The cycles a depth-first walk meets, at least one per knot of modules, each as its files in import order starting
 * with the first by name, which is repeated at the end.
 */
function cycles(graph: ReadonlyMap<string, readonly string[]>): string[] {
  const found = new Set<string>();
  const done = new Set<string>();
  const visit = (file: string, path: readonly string[]): void => {
    const at = path.indexOf(file);
    if (at !== -1) {
      const loop = path.slice(at);
      const start = loop.indexOf([...loop].sort()[0] ?? file);
      found.add([...loop.slice(start), ...loop.slice(0, start), loop[start]].join(' -> '));
      return;
    }
    if (done.has(file)) return;
    for (const next of graph.get(file) ?? []) visit(next, [...path, file]);
    done.add(file);
  };
  for (const file of [...graph.keys()].sort()) visit(file, []);
  return [...found];
}
