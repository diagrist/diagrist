import { checkPlugin, formatMessage } from '@diagrist/core';
import { grammarOf } from '@diagrist/lang';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { codes, sequence } from './compile.js';

const heads = ['participant a "A"', 'participant b "B"'];

/** The grammar of the sequence kind as `dgr grammar sequence --json` gives it. */
const grammar = () => grammarOf(umlPlugin.kinds[0]?.spec ?? { name: '', doc: '', header: {}, statements: [] });

/** Follows a JSON Pointer (RFC 6901) without escapes, as the grammar writes them. */
const resolve = (root: unknown, pointer: string): unknown =>
  pointer
    .split('/')
    .slice(1)
    .reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], root);

describe('the sequence tables', () => {
  it('document every statement, argument, attribute and flag, and every rule has en and de messages', () => {
    expect(checkPlugin(umlPlugin)).toEqual([]);
  });

  it('describe fragments as recursive data for agents', () => {
    const statements = grammar().statements;
    const at = statements.findIndex((s) => s.keyword === 'alt');
    const children = statements[at]?.children ?? [];
    expect(children.map((c) => c.keyword)).toEqual(expect.arrayContaining(['else', 'loop', 'msg']));
    expect(children.find((c) => c.keyword === 'alt')).toEqual({ keyword: 'alt', ref: `/statements/${at}` });
  });

  it('describe every table in full once, everywhere else by a pointer that resolves to it', () => {
    const data = grammar();
    const json = JSON.stringify(data);
    expect(json.length, 'about 45 KB; before references it was 284 KB').toBeLessThan(60_000);
    const full: string[] = [];
    const visit = (node: unknown, at: string): void => {
      if (node === null || typeof node !== 'object') return;
      const entry = node as { keyword?: unknown; ref?: unknown; children?: unknown };
      if (typeof entry.ref === 'string')
        expect(resolve(data, entry.ref), `${at} -> ${entry.ref}`).toMatchObject({ keyword: entry.keyword });
      else if (typeof entry.keyword === 'string' && Array.isArray(entry.children)) full.push(entry.keyword);
      for (const [key, value] of Object.entries(node)) visit(value, `${at}/${key}`);
    };
    visit(data, '');
    expect(full.length).toBe(new Set(full).size);
  });
});

describe('fragments nested by indentation', () => {
  it('keep their operands and nesting in order, as the description shows', () => {
    const result = sequence(
      ...heads,
      'loop "while open"',
      '  alt "valid"',
      '    msg a -> b "check"',
      '    msg b --> a "ok"',
      '    else',
      '      msg a ~> b "retry"',
      'msg a ~> b "done"',
    );
    expect(codes(result)).toEqual([]);
    expect(result.description?.split('\n').slice(2)).toEqual([
      'Repetition [while open]:',
      '  Alternative [valid]:',
      '    1. A calls B: check.',
      '    2. B replies to A: ok.',
      '  Otherwise [else]:',
      '    3. A sends asynchronously to B: retry.',
      '4. A sends asynchronously to B: done.',
    ]);
  });

  it('allow operand markers only in their fragments, and dividers only at the top level', () => {
    const misplaced = sequence(...heads, 'loop "x"', '  msg a ~> b', '  else', '    msg b ~> a', '  divider "d"');
    expect(codes(misplaced)).toEqual(['L101', 'L101']);
    const [marker] = misplaced.diagnostics;
    expect(marker && formatMessage(marker, [umlPlugin])).toContain('Unknown keyword `else` here');
    expect(codes(sequence(...heads, 'else', '  msg a ~> b'))).toEqual(['L101']);
  });

  it('report a statement written after an operand marker at its level', () => {
    const result = sequence(...heads, 'alt "x"', '  msg a ~> b', '  else', '    msg b ~> a', '  msg a ~> b');
    expect(result.diagnostics.map((d) => [d.code, d.span.line])).toEqual([['U401', 8]]);
  });

  it('allow only events of the lifeline inside a coregion', () => {
    expect(codes(sequence(...heads, 'coregion a', '  create a -> b'))).toEqual(['L101']);
  });

  it('check ids declared in attributes: marks, message names and frames', () => {
    const result = sequence(
      ...heads,
      'msg a ~> b "x" id=first mark=E9',
      'msg b ~> a id=first',
      'duration first last "1 s"',
    );
    expect(codes(result)).toEqual(['L107', 'L108', 'L107']);
  });
});
