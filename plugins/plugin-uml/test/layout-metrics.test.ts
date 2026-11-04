import { compile, type Drawing, type Plugin } from '@diagrist/core';
import { LINE_RULES, lineFindings, lineMetrics, linesOfDrawing } from '@diagrist/layout-grid';
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

describe('layout metrics', () => {
  it('are recorded per picture: the measures of its lines and the breaches of each hard rule', () => {
    const lines = ['activity', 'class', 'sequence', 'state', 'usecase'].flatMap((kind) => {
      const { names, source } = examplesOf(kind);
      return [...names].sort().flatMap((name) => rows(kind, name, source(name)));
    });
    const table = `{\n  ${lines.join(',\n  ')}\n}\n`;
    expect(compareGolden(golden('layout-metrics.json'), table)).toEqual({ status: 'match' });
  });
});
