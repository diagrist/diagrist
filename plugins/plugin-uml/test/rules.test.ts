import { formatMessage } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { codes, sequence } from './compile.js';

const ab = ['participant a "A"', 'participant b "B"'];

/** One minimal source per rule that must trigger it. */
const CASES: readonly (readonly [string, readonly string[]])[] = [
  ['U400', [...ab, 'msg a ~> c "to nobody"']],
  ['U400', [...ab, 'note "n" over=a,x']],
  ['U401', [...ab, 'alt "x"', '  msg a ~> b', '  else', '    msg b ~> a', '  msg a ~> b']],
  ['U403', [...ab, 'msg b --> a "ok"']],
  ['U404', [...ab, 'create a -> b "new"', 'create a -> b "new"']],
  ['U405', [...ab, 'msg a ~> b', 'deactivate b']],
  ['U408', [...ab, 'msg lost ~> a']],
  ['U450', [...ab, 'msg gate -> gate.x']],
  ['U451', [...ab, 'ignore', '  msg a ~> b']],
  ['U452', [...ab, 'note "n"']],
  [
    'U453',
    ['participant a "A"', 'participant b "B"', 'participant c "C"', 'coregion a', '  msg b ~> c', '  msg a ~> c'],
  ],
  ['U454', [...ab, 'loop "x" id=f', '  msg a ~> b', 'msg a ~> f.out']],
  ['U900', [...ab, 'alt "x"', '  msg a ~> b']],
  ['U901', [...ab, 'msg a -> b "call"']],
  ['U902', [...ab, 'participant c "C"', 'msg a ~> b']],
  ['U903', [...ab, 'alt "x"', '  msg a ~> b', '  else']],
  ['U904', [...ab, 'alt', '  msg a ~> b', '  else', '    msg b ~> a']],
  ['U905', [...ab, 'msg a ~> b', 'activate b']],
  ['U906', [...ab, 'msg a ~> b id=m1', 'msg b ~> a id=m2', 'duration m2 m1 "1 s"']],
  ['U907', [...ab, 'msg a -> lost "gone"', 'msg b ~> a']],
  ['U908', [...ab, 'msg a ~> a "self" duration="1 s"', 'msg a ~> b']],
  ['U909', [...ab, 'coregion a', '  msg a ~> b']],
  ['U950', [...ab, 'loop "x" id=f', '  msg a ~> b']],
  ['U951', [...ab, 'msg gate.in ~> a "one"', 'msg gate.in ~> b "two"']],
];

describe('sequence rules', () => {
  it.each(CASES)('%s finds its case and phrases it in en and de', (code, lines) => {
    const result = sequence(...lines);
    expect(codes(result)).toContain(code);
    const found = result.diagnostics.find((d) => d.code === code);
    for (const locale of ['en', 'de'] as const) {
      const text = found ? formatMessage(found, [umlPlugin], locale) : '';
      expect(text).not.toBe(code);
      expect(text).not.toMatch(/undefined/);
    }
  });

  it('cover every rule of the kind', () => {
    const rules = umlPlugin.kinds.flatMap((k) => k.rules.map((r) => r.code));
    expect([...new Set(CASES.map(([code]) => code))].sort()).toEqual([...rules].sort());
  });

  it('draws the picture despite warnings, but not with an error', () => {
    expect(sequence(...ab, 'msg a -> b "call"').svg).toBeDefined();
    expect(sequence(...ab, 'msg b --> a "ok"').svg).toBeUndefined();
  });

  it('pairs a reply with the innermost open call in the opposite direction', () => {
    const nested = sequence(...ab, 'msg a -> b "outer"', 'msg b -> b "inner"', 'msg b --> b', 'msg b --> a');
    expect(codes(nested)).toEqual([]);
  });

  it('starts every alternative from the calls open before the fragment', () => {
    const replies = ['msg a -> b "ask"', 'alt "yes"', '  msg b --> a "yes"', '  else', '    msg b --> a "no"'];
    expect(codes(sequence(...ab, ...replies))).toEqual([]);
  });
});
