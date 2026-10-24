import { describe, expect, it } from 'vitest';
import { lineOf, type Node, parse, sourceFiles } from './source.js';

/**
 * Kernel and plugins must render the same bytes for the same input, in Node, browsers and edge runtimes.
 * Their sources therefore use no clock, no randomness, no console, no timers, no network and no Node APIs.
 */
const PURE_SOURCES = [/^packages\/lang\/src\//, /^packages\/core\/src\//, /^plugins\/[^/]+\/src\//];

const FORBIDDEN_GLOBALS = new Set([
  'Date',
  'performance',
  'console',
  'process',
  'fetch',
  'setTimeout',
  'setInterval',
  'crypto',
]);

describe('pure sources', () => {
  it('use no clock, randomness, console, timers, network or Node APIs', () => {
    const offending = sourceFiles()
      .filter((file) => PURE_SOURCES.some((pattern) => pattern.test(file)))
      .flatMap((file) => {
        const { source, program } = parse(file);
        return impurities(program).map((found) => `${file}:${lineOf(source, found.at)}  ${found.what}`);
      });
    expect(offending).toEqual([]);
  });
});

function impurities(program: unknown): { at: number; what: string }[] {
  const found: { at: number; what: string }[] = [];
  walk(program, undefined, undefined, (node, parent, key) => {
    if (node.type === 'ImportDeclaration' || node.type === 'ImportExpression') {
      const from = (node.source as { value?: unknown } | undefined)?.value;
      if (typeof from === 'string' && from.startsWith('node:')) found.push({ at: node.start, what: `import ${from}` });
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
