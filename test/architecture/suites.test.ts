import { describe, expect, it } from 'vitest';
import { lineOf, type Node, nodes, parse, sourceFiles } from './source.js';

/**
 * A skipped test passes CI without checking anything, and nobody sees the gap. Tests are therefore deleted or fixed,
 * never parked with `.skip` or `.todo`. A forgotten `.only` is caught by vitest itself (`allowOnly` is off in CI).
 */
const RUNNERS = new Set(['it', 'test', 'describe', 'suite']);

const PARKED = new Set(['skip', 'todo']);

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
});

/** `it.skip`, `describe.todo`, also behind modifiers such as `it.concurrent.skip`. */
function parked(member: Node): boolean {
  const property = (member.property as Node).name as string | undefined;
  if (property === undefined || !PARKED.has(property)) return false;
  let object = member.object as Node;
  while (object.type === 'MemberExpression') object = object.object as Node;
  return object.type === 'Identifier' && RUNNERS.has(object.name as string);
}
