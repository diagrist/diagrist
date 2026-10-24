import { describe, expect, it } from 'vitest';
import { lineOf, type Node, nodes, parse, sourceFiles } from './source.js';

/**
 * A skipped test passes CI without checking anything, and nobody sees the gap. Tests are therefore deleted or fixed,
 * never parked with `.skip` or `.todo`. A forgotten `.only` is caught by vitest itself (`allowOnly` is off in CI).
 */
const RUNNERS = new Set(['it', 'test', 'describe', 'suite']);

const PARKED = new Set(['skip', 'todo']);

/** Runners and hooks that take a time limit, as an option or as a number after the function. */
const TIMED = new Set([...RUNNERS, 'beforeAll', 'beforeEach', 'afterAll', 'afterEach']);

/** Keys that set a time limit: per test or suite, and for all of them in a config or through `vi.setConfig`. */
const LIMITS = new Set(['timeout', 'testTimeout', 'hookTimeout']);

describe('test suites', () => {
  it('park no test with `.skip` or `.todo`', () => {
    const offending = sourceFiles()
      .filter((file) => file.endsWith('.test.ts'))
      .flatMap((file) => {
        const { source, program } = parse(file);
        return [...nodes(program)]
          .filter((node) => node.type === 'MemberExpression' && parked(node))
          .map((node) => `${file}:${lineOf(source, node.start)}  ${source.slice(node.start, node.end as number)}`);
      });
    expect(offending).toEqual([]);
  });

  /**
   * A slow test is made fast, not given more time: a raised limit hides code that got slower, and five seconds, the
   * default of vitest, is a lot for a layout measured in milliseconds.
   */
  it('raise no time limit', () => {
    const offending = sourceFiles()
      .filter((file) => file.endsWith('.test.ts') || /(^|\/)vitest\.config\.ts$/.test(file))
      .flatMap((file) => {
        const { source, program } = parse(file);
        return [...nodes(program)]
          .flatMap(limitsIn)
          .map((node) => `${file}:${lineOf(source, node.start)}  ${source.slice(node.start, node.end as number)}`);
      });
    expect(offending).toEqual([]);
  });
});

/** `it.skip`, `describe.todo`, also behind modifiers such as `it.concurrent.skip`. */
function parked(member: Node): boolean {
  const property = (member.property as Node).name as string | undefined;
  if (property === undefined || !PARKED.has(property)) return false;
  let object = member.object as Node;
  while (object.type === 'MemberExpression') object = object.object as Node;
  return object.type === 'Identifier' && RUNNERS.has(object.name as string);
}

/** A key such as `timeout: 30_000` anywhere, or the number passed to a runner or hook as in `it(name, fn, 20_000)`. */
function limitsIn(node: Node): Node[] {
  if (node.type === 'Property') return LIMITS.has((node.key as Node).name as string) ? [node] : [];
  if (node.type !== 'CallExpression' || !TIMED.has(runnerOf(node.callee as Node) ?? '')) return [];
  return (node.arguments as Node[]).filter(
    (argument) => argument.type === 'Literal' && typeof argument.value === 'number',
  );
}

/** The name a call starts from: `it` for `it(...)`, `it.each(table)(...)` and `it.concurrent(...)`. */
function runnerOf(callee: Node): string | undefined {
  let node = callee;
  while (node.type === 'MemberExpression' || node.type === 'CallExpression')
    node = (node.type === 'MemberExpression' ? node.object : node.callee) as Node;
  return node.type === 'Identifier' ? (node.name as string) : undefined;
}
