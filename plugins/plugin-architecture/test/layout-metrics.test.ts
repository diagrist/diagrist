import { type Drawing, LINE_RULES, lineFindings, lineMetrics, linesOfDrawing, type Plugin } from '@diagrist/core';
import { compareGolden } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { context } from '../src/kinds.js';
import { compileExample, exampleNames, golden, plugins } from './compile.js';

/** The plugins with every kind's layout recorded, so the test reads what the kernel was handed. */
const drawings: Drawing[] = [];
const recorded: Plugin[] = plugins.map((p) => ({
  ...p,
  kinds: p.kinds.map((k) => ({ ...k, layout: (m, c) => drawings[drawings.push(k.layout(m, c)) - 1] as Drawing })),
}));

/** The thresholds the C4 kinds ask the kernel's line check for. */
const THRESHOLDS = context.lineCheck === false || context.lineCheck === undefined ? {} : context.lineCheck;

/** Each picture of an example with lines, by `dir/name.dgr` or `dir/name.dgr#variant`, as one line of the table. */
function rows(name: string): string[] {
  drawings.length = 0;
  const { pictures } = compileExample(name, undefined, recorded);
  const last = drawings.slice(-pictures.length);
  return pictures.flatMap((p, i) => {
    const input = linesOfDrawing(last[i] as Drawing);
    if (input.routes.length === 0) return [];
    const found = lineFindings(input, THRESHOLDS);
    const counts = Object.fromEntries(LINE_RULES.map((r) => [r, found.filter((f) => f.rule === r).length]));
    const picture = p.variant === undefined ? name : `${name}#${p.variant}`;
    return [`${JSON.stringify(picture)}: ${JSON.stringify({ ...lineMetrics(input), findings: counts })}`];
  });
}

describe('layout metrics', () => {
  it('are recorded per picture: the measures of its lines and the breaches of each hard rule', () => {
    const table = `{\n  ${exampleNames.flatMap(rows).join(',\n  ')}\n}\n`;
    expect(compareGolden(golden('layout-metrics.json'), table)).toEqual({ status: 'match' });
  });
});
