import { type Drawing, LINE_RULES, lineFindings, lineMetrics, linesOfDrawing } from '@diagrist/core';
import { compareGolden } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { drawn, examplesOf, golden } from './compile.js';

/** Each picture of an example with lines, by `kind/name.dgr` or `kind/name.dgr#variant`, as one line of the table. */
function rows(kind: string, name: string, source: string): string[] {
  const { pictures, drawings } = drawn(source);
  return pictures.flatMap((p, i) => {
    const input = linesOfDrawing(drawings[i] as Drawing);
    if (input.routes.length === 0) return [];
    const found = lineFindings(input);
    const counts = Object.fromEntries(LINE_RULES.map((r) => [r, found.filter((f) => f.rule === r).length]));
    const picture = `${kind}/${name}${p.variant === undefined ? '' : `#${p.variant}`}`;
    return [`${JSON.stringify(picture)}: ${JSON.stringify({ ...lineMetrics(input), findings: counts })}`];
  });
}

const KINDS = ['activity', 'class', 'sequence', 'state', 'usecase'];

/** Every example of every kind as `kind/name.dgr`, kind by kind and by name, the order of the table. */
const examples = KINDS.flatMap((kind) => [...examplesOf(kind).names].sort().map((name) => `${kind}/${name}`));

/** The rows of every example, filled example by example, so no single test draws more than one example. */
const table = new Map<string, string[]>();

describe('layout metrics', () => {
  it.each(examples)('are measured for every picture of %s', (example) => {
    const [kind = '', name = ''] = example.split('/');
    table.set(example, rows(kind, name, examplesOf(kind).source(name)));
  });

  it('are recorded per picture: the measures of its lines and the breaches of each hard rule', () => {
    expect(examples.filter((example) => !table.has(example))).toEqual([]);
    const lines = examples.flatMap((example) => table.get(example) ?? []);
    const text = `{\n  ${lines.join(',\n  ')}\n}\n`;
    expect(compareGolden(golden('layout-metrics.json'), text)).toEqual({ status: 'match' });
  });
});
