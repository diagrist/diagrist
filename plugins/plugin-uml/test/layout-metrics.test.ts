import {
  compile,
  type Drawing,
  LINE_RULES,
  lineFindings,
  lineMetrics,
  linesOfDrawing,
  type Plugin,
} from '@diagrist/core';
import { compareGolden } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { examplesOf, golden } from './compile.js';

/** The plugin with every kind's layout recorded, so the test reads what the kernel was handed. */
const drawings: Drawing[] = [];
const recorded: Plugin = {
  ...umlPlugin,
  kinds: umlPlugin.kinds.map((k) => ({
    ...k,
    layout: (m, c) => drawings[drawings.push(k.layout(m, c)) - 1] as Drawing,
  })),
};

/** Each picture of an example with lines, by `kind/name.dgr` or `kind/name.dgr#variant`, as one line of the table. */
function rows(kind: string, name: string, source: string): string[] {
  drawings.length = 0;
  const { pictures } = compile(source, { plugins: [recorded] });
  return pictures.flatMap((p, i) => {
    const input = linesOfDrawing(drawings[i] as Drawing);
    if (input.routes.length === 0) return [];
    const found = lineFindings(input);
    const counts = Object.fromEntries(LINE_RULES.map((r) => [r, found.filter((f) => f.rule === r).length]));
    const picture = `${kind}/${name}${p.variant === undefined ? '' : `#${p.variant}`}`;
    return [`${JSON.stringify(picture)}: ${JSON.stringify({ ...lineMetrics(input), findings: counts })}`];
  });
}

/** The rows of every kind, filled kind by kind, so no single test draws all examples. */
const table = new Map<string, string[]>();
const KINDS = ['activity', 'class', 'sequence', 'state', 'usecase'];

describe('layout metrics', () => {
  it.each(KINDS)('are measured for every picture of %s', (kind) => {
    const { names, source } = examplesOf(kind);
    table.set(
      kind,
      [...names].sort().flatMap((name) => rows(kind, name, source(name))),
    );
  });

  it('are recorded per picture: the measures of its lines and the breaches of each hard rule', () => {
    const lines = KINDS.flatMap((kind) => table.get(kind) ?? []);
    expect(table.size).toBe(KINDS.length);
    const text = `{\n  ${lines.join(',\n  ')}\n}\n`;
    expect(compareGolden(golden('layout-metrics.json'), text)).toEqual({ status: 'match' });
  });
});
