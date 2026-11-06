import { readdirSync, readFileSync } from 'node:fs';
import {
  type Compilation,
  compile,
  type Drawing,
  type LineCheck,
  lineFindings,
  lineMetrics,
  linesOfDrawing,
  type Plugin,
} from '@diagrist/core';
import type { BudgetEntry } from '@diagrist/testkit';

/**
 * What no stress picture may show, as prefixes of the counts of `stressEntries`: a line through a box or text, ports
 * too close or out of order, a text on something or near a foreign line.
 */
export const HARD = ['through', 'ports', 'label/overlap', 'label/near'] as const;

/** A stress fixture compiled: its errors and one budget entry per picture, `name` or `name#variant`. */
export interface Stressed {
  readonly errors: Compilation['diagnostics'];
  readonly entries: Readonly<Record<string, BudgetEntry>>;
}

/** The fixtures of a stress set, the `.dgr` files of `folder`, sorted, and a reader for one of them. */
export function stressSet(folder: URL): { names: readonly string[]; source: (name: string) => string } {
  return {
    names: readdirSync(folder)
      .filter((f) => f.endsWith('.dgr'))
      .sort(),
    source: (name) => readFileSync(new URL(name, folder), 'utf8'),
  };
}

/**
 * Compiles a fixture with the layouts of `plugins` recorded and counts, per picture, the findings of the line check
 * under the thresholds of its kind by rule and the way it is breached (`label/near`), the crossings of
 * `lineMetrics` (counted for every picture, while the rule reports them up to 15 lines only), its lines on one
 * another (`overlaps`) and bends a straight line could have spared (`avoidable`), and the diagnostics of the codes
 * `placement` names (`G400/texts`); the other measures of `lineMetrics` go along unbudgeted.
 */
export function stressEntries(
  plugins: readonly Plugin[],
  name: string,
  source: string,
  placement: readonly string[] = [],
): Stressed {
  const drawn: { drawing: Drawing; check: LineCheck | undefined }[] = [];
  const recorded: Plugin[] = plugins.map((p) => ({
    ...p,
    kinds: p.kinds.map((k) => ({
      ...k,
      layout: (m, c) => {
        const drawing = k.layout(m, c);
        drawn.push({ drawing, check: k.lineCheck });
        return drawing;
      },
    })),
  }));
  const { pictures, diagnostics } = compile(source, { plugins: recorded, path: name });
  const errors = diagnostics.filter((d) => d.severity === 'error');
  const entries = Object.fromEntries(
    pictures.map((p, i) => {
      const { drawing, check } = drawn[i] as (typeof drawn)[number];
      const input = linesOfDrawing(drawing);
      const { crossings, overlaps, avoidable, ...measures } = lineMetrics(input);
      const counts: Record<string, number> = { crossings, overlaps, avoidable, jog: 0, parallel: 0, bends: 0 };
      const keys = [
        ...lineFindings(input, check === false ? {} : check)
          .filter((f) => f.rule !== 'crossing')
          .map((f) => (f.detail === undefined ? f.rule : `${f.rule}/${f.detail}`)),
        ...diagnostics
          .filter((d) => placement.includes(d.code) && d.picture === p.variant)
          .map((d) => (d.values.case === undefined ? d.code : `${d.code}/${d.values.case}`)),
      ];
      for (const key of keys.sort()) counts[key] = (counts[key] ?? 0) + 1;
      const picture = p.variant === undefined ? name : `${name}#${p.variant}`;
      return [picture, { counts, measures }];
    }),
  );
  return { errors, entries };
}

/** The counts of an entry that break a hard rule, those of `HARD` and of the codes `placement` names. */
export function hardCounts(entry: BudgetEntry, placement: readonly string[] = []): Record<string, number> {
  const hard = [...HARD, ...placement];
  return Object.fromEntries(
    Object.entries(entry.counts).filter(([key, n]) => n > 0 && hard.some((h) => key === h || key.startsWith(`${h}/`))),
  );
}
