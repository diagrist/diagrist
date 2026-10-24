import { describe, expect, it } from 'vitest';
import { lineOf, type Node, parse, sourceFiles } from './source.js';

/**
 * Kernel and plugins must render the same bytes for the same input, in Node, browsers and edge runtimes.
 * Their sources therefore use no clock, no randomness, no console, no timers, no network and no Node APIs.
 * The CLI follows the same rule so its commands run in tests on in-memory input and output; only its host
 * adapters touch the process and the file system. The workspace tools derive files as strings and leave writing
 * them to their tests, so they follow it too.
 */
const PURE_SOURCES = [
  /^packages\/lang\/src\//,
  /^packages\/core\/src\//,
  /^packages\/parts\/src\//,
  /^packages\/layout-grid\/src\//,
  /^packages\/cli\/src\//,
  /^plugins\/[^/]+\/src\//,
  /^tools\/[^/]+\/src\//,
];

const FORBIDDEN_GLOBALS = new Set([
  'Date',
  'performance',
  'console',
  'process',
  'fetch',
  'setTimeout',
  'setInterval',
  'crypto',
  'Intl',
]);

/**
 * String and number methods whose result depends on the locale of the runtime, so the same input could give other
 * bytes on another machine: sorting with `localeCompare` is the classic case.
 */
const LOCALE_METHODS = new Set([
  'localeCompare',
  'toLocaleString',
  'toLocaleLowerCase',
  'toLocaleUpperCase',
  'toLocaleDateString',
  'toLocaleTimeString',
]);

/**
 * Host adapters: the only files under a pure source that may use `process` and import `node:` modules. Each is
 * the Node entry of its package and is never imported by the pure code beside it: the CLI's process, files and
 * file watcher, and `@diagrist/export-png/node`, which reads resvg's WebAssembly module and the kernel's fonts
 * from disk.
 */
const HOST_ADAPTERS = new Set([
  'packages/cli/src/main.ts',
  'packages/cli/src/node-io.ts',
  'packages/cli/src/node-watcher.ts',
  'plugins/export-png/src/node.ts',
]);

/** Node modules without host access that pure sources below a path may import: `parseArgs` only reads its input. */
const PURE_NODE_MODULES: readonly { readonly below: string; readonly module: string }[] = [
  { below: 'packages/cli/src/', module: 'node:util' },
];

describe('pure sources', () => {
  it('use no clock, randomness, console, timers, network, Node APIs or locale of the runtime', () => {
    const offending = sourceFiles()
      .filter((file) => PURE_SOURCES.some((pattern) => pattern.test(file)))
      .flatMap((file) => {
        const { source, program } = parse(file);
        return impurities(program)
          .filter((found) => !allowed(file, found.what))
          .map((found) => `${file}:${lineOf(source, found.at)}  ${found.what}`);
      });
    expect(offending).toEqual([]);
  });
});

function allowed(file: string, what: string): boolean {
  if (HOST_ADAPTERS.has(file)) return what === 'process' || what.startsWith('import node:');
  return PURE_NODE_MODULES.some(({ below, module }) => file.startsWith(below) && what === `import ${module}`);
}

function impurities(program: unknown): { at: number; what: string }[] {
  const found: { at: number; what: string }[] = [];
  walk(program, undefined, undefined, (node, parent, key) => {
    if (node.type === 'ImportDeclaration' || node.type === 'ImportExpression') {
      const from = (node.source as { value?: unknown } | undefined)?.value;
      if (typeof from === 'string' && from.startsWith('node:')) found.push({ at: node.start, what: `import ${from}` });
    }
    if (node.type === 'Identifier' && parent?.type === 'MemberExpression' && key === 'property') {
      const method = node.name as string;
      if (LOCALE_METHODS.has(method)) found.push({ at: node.start, what: method });
    }
    if (node.type !== 'Identifier' || !isReference(parent, key)) return;
    const name = node.name as string;
    if (FORBIDDEN_GLOBALS.has(name)) found.push({ at: node.start, what: name });
    if (name === 'Math' && parent?.type === 'MemberExpression' && (parent.property as Node).name === 'random') {
      found.push({ at: node.start, what: 'Math.random' });
    }
  });
  return found;
}

function isReference(parent: Node | undefined, key: string | undefined): boolean {
  if (parent === undefined) return true;
  if (parent.type === 'MemberExpression' && key === 'property' && parent.computed !== true) return false;
  if (
    (parent.type === 'Property' || parent.type === 'PropertyDefinition' || parent.type === 'MethodDefinition') &&
    key === 'key'
  )
    return false;
  return !parent.type.startsWith('TS');
}

function walk(
  value: unknown,
  parent: Node | undefined,
  key: string | undefined,
  visit: (n: Node, p?: Node, k?: string) => void,
): void {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, parent, key, visit);
    return;
  }
  if (value === null || typeof value !== 'object') return;
  const node = value as Node;
  const isNode = typeof node.type === 'string';
  if (isNode) visit(node, parent, key);
  for (const [childKey, child] of Object.entries(node)) {
    if (child !== null && typeof child === 'object')
      walk(child, isNode ? node : parent, isNode ? childKey : key, visit);
  }
}
