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
 * it reaches another kind's folder, neither directly nor through the files beside the kinds. A piece two kinds draw
 * alike lives in a folder of its own such as `src/shared`, which imports no kind, so a change for one kind cannot
 * break another unseen and the entry of a kind bundles no other (ADR 0024). Type imports count too: a shared type that
 * names one kind's model ties the others to it.
 */
describe('kinds of a plugin', () => {
  const files = sourceFiles().filter((file) => file.startsWith('plugins/') && isIn('src', file));
  const kinds = files.filter((file) => file.endsWith('/kind.ts')).map((file) => file.slice(0, -'kind.ts'.length));
  const graph = new Map(files.map((file) => [file, relativeImports(file).map((i) => i.target)]));

  it('reach nothing of each other', () => {
    expect(kinds.length).toBeGreaterThan(1);
    expect(kindLeaks(graph, kinds)).toEqual([]);
  });

  it('are found reaching each other directly and through a shared file', () => {
    const fake = new Map([
      ['p/src/a/x.ts', ['p/src/shared/s.ts', 'p/src/a/y.ts']],
      ['p/src/a/y.ts', ['p/src/b/z.ts']],
      ['p/src/shared/s.ts', ['p/src/shared/t.ts']],
      ['p/src/shared/t.ts', ['p/src/b/z.ts']],
      ['p/src/b/z.ts', ['p/src/shared/u.ts']],
    ]);
    expect(kindLeaks(fake, ['p/src/a/', 'p/src/b/'])).toEqual([
      'p/src/a/x.ts -> p/src/shared/s.ts -> p/src/shared/t.ts -> p/src/b/z.ts',
      'p/src/a/y.ts -> p/src/b/z.ts',
    ]);
  });
});

/**
 * Each way from a file of a kind to a file of another kind, through files of no kind only, as the chain of files; the
 * first way found per pair of file and foreign kind.
 */
function kindLeaks(graph: ReadonlyMap<string, readonly string[]>, kinds: readonly string[]): string[] {
  const kindOf = (file: string) => kinds.find((folder) => file.startsWith(folder));
  return [...graph.keys()].flatMap((start) => {
    const own = kindOf(start);
    if (own === undefined) return [];
    const found = new Map<string, string>();
    const seen = new Set<string>();
    const walk = (file: string, path: readonly string[]): void => {
      for (const next of graph.get(file) ?? []) {
        const kind = kindOf(next);
        if (kind !== undefined && kind !== own && !found.has(kind)) found.set(kind, [...path, next].join(' -> '));
        if (kind !== undefined || seen.has(next)) continue;
        seen.add(next);
        walk(next, [...path, next]);
      }
    };
    walk(start, [start]);
    return [...found.values()];
  });
}

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
