import { arg, kind, statement, text } from '@diagrist/lang';
import { describe, expect, it } from 'vitest';
import {
  compile,
  defineKind,
  definePlugin,
  type EdgeAnchor,
  formatMessage,
  type LineCheck,
  localeAttribute,
  type Point,
} from '../src/index.js';
import { styles } from './fixture.js';

const wire = statement('wire', {
  doc: 'A line from the top left box to the bottom right one, or, the second time, from top right to bottom left.',
  examples: ['wire "first"'],
  arguments: [arg('name', text(), 'What the line is called.')],
});

const spec = kind('wires', { doc: 'Crossing wires.', header: { locale: localeAttribute }, statements: [wire] });

const rect = (x: number, y: number) => ({ x, y, w: 80, h: 40 });
const BOXES = [
  { id: 'a', domId: 'node-a', rect: rect(0, 0) },
  { id: 'b', domId: 'node-b', rect: rect(200, 0) },
  { id: 'c', domId: 'node-c', rect: rect(0, 200) },
  { id: 'd', domId: 'node-d', rect: rect(200, 200) },
];
const ENDS: readonly (readonly [string, string, Point, Point, number])[] = [
  ['a', 'd', [60, 40], [220, 200], 110],
  ['b', 'c', [240, 40], [40, 200], 130],
];

/** A kind whose two wires cross in the middle, taking part in the line check as `check` says. */
function wires(check?: LineCheck) {
  const kindOf = defineKind({
    spec,
    model: (reading) => reading.statements.map((s) => s.span),
    rules: [],
    layout: (spans) => ({
      scene: { width: 300, height: 260, title: 'wires', children: [] },
      styles,
      anchors: {
        width: 300,
        height: 260,
        nodes: BOXES,
        groups: [],
        edges: spans.slice(0, 2).map((span, index): EdgeAnchor => {
          const [from, to, start, end, y] = ENDS[index] as (typeof ENDS)[number];
          const points: Point[] = [start, [start[0], y], [end[0], y], end];
          return { index, from, to, domId: `edge-${index}`, points, span };
        }),
      },
    }),
    describe: () => 'wires',
    ...(check === undefined ? {} : { lineCheck: check }),
  });
  return definePlugin({ name: 'wires', kinds: [kindOf], messages: {} });
}

const source = ['diagram wires "Wires"', 'wire "first"', 'wire "second"'].join('\n');

describe('the line check of the kernel', () => {
  it('reports a crossing as G410, at the line that declares the first wire, with both named by their ends', () => {
    const { diagnostics } = compile(source, { plugins: [wires()] });
    expect(diagnostics.map((d) => [d.code, d.severity, d.span.line, d.values])).toEqual([
      ['G410', 'warning', 2, { line: '`a` → `d`', other: '`b` → `c`' }],
    ]);
  });

  it('says what crossed and what an author can change, in English and German', () => {
    const [found] = compile(source, { plugins: [wires()] }).diagnostics;
    if (found === undefined) throw new Error('no finding');
    expect(formatMessage(found, [], 'en')).toMatch(
      /^The line `a` → `d` crosses the line `b` → `c`\. Try another order/,
    );
    expect(formatMessage(found, [], 'de')).toMatch(
      /^Die Linie `a` → `d` kreuzt die Linie `b` → `c`\. Die Deklarationen/,
    );
  });

  it('leaves out a kind that opts out, and takes the thresholds a kind gives', () => {
    expect(compile(source, { plugins: [wires(false)] }).diagnostics).toEqual([]);
    expect(compile(source, { plugins: [wires({ crossingsUpTo: 1 })] }).diagnostics).toEqual([]);
  });

  it('names the measure and the limit of a rule, such as the straight run into the head', () => {
    const { diagnostics } = compile(source, { plugins: [wires({ crossingsUpTo: 1, lead: 100 })] });
    expect(diagnostics.map((d) => [d.code, d.values.value, d.values.limit])).toEqual([
      ['G413', '90', '100'],
      ['G413', '70', '100'],
    ]);
  });
});
