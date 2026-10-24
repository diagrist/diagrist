import type { Finding, Rule } from '@diagrist/core';
import type { ArchitectureModel } from '../model/types.js';

/** A rule on the model of a C4 diagram. */
export type ArchitectureRule = Rule<ArchitectureModel>;

export const noteTarget: ArchitectureRule = {
  code: 'A001',
  severity: 'error',
  doc: 'A note names the element it points at with `on`.',
  check: (m) => m.notes.filter((n) => n.on === undefined).map((n) => ({ span: n.source })),
};

export const groupRole: ArchitectureRule = {
  code: 'A007',
  severity: 'error',
  doc: 'A group has exactly one role: `own`, `shared` or `external`. The role draws its frame and mutes shared elements.',
  check: (m) =>
    m.groups.flatMap((g): Finding[] =>
      g.roles.length === 1
        ? []
        : [
            {
              span: g.source,
              values: { id: g.id, case: g.roles.length ? 'several' : 'none', roles: g.roles.join(', ') },
            },
          ],
    ),
};

export const elementPlace: ArchitectureRule = {
  code: 'A008',
  severity: 'error',
  doc: 'Every element has a place in the grid with `at column/row`.',
  check: (m) =>
    m.nodes
      .filter((n) => n.at === undefined)
      .map((n) => ({ span: n.source, values: { id: n.id, example: `${m.cols[0] ?? 'col'}/${m.rows[0] ?? 'row'}` } })),
};
