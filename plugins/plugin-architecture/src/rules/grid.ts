import type { Finding } from '@diagrist/core';
import { list } from '@diagrist/lang';
import type { ArchitectureRule } from './presence.js';

export const placeInGrid: ArchitectureRule = {
  code: 'A103',
  severity: 'error',
  doc: 'Column and row of `at` are names of the grid.',
  check: (m) =>
    m.nodes.flatMap((n): Finding[] => {
      if (n.at === undefined) return [];
      const out: Finding[] = [];
      if (!m.cols.includes(n.at.col))
        out.push({ span: n.source, values: { case: 'column', id: n.id, found: n.at.col, known: list(m.cols) } });
      if (!m.rows.includes(n.at.row))
        out.push({ span: n.source, values: { case: 'row', id: n.id, found: n.at.row, known: list(m.rows) } });
      return out;
    }),
};

export const gridTwice: ArchitectureRule = {
  code: 'A106',
  severity: 'error',
  doc: 'Every column and every row is named once.',
  check: (m) => {
    const seen = { cols: new Set<string>(), rows: new Set<string>() };
    return m.grids.flatMap((g) =>
      g.names.flatMap((name): Finding[] => {
        const names = seen[g.axis];
        const twice = names.has(name);
        names.add(name);
        return twice ? [{ span: g.source, values: { case: g.axis, name } }] : [];
      }),
    );
  },
};
