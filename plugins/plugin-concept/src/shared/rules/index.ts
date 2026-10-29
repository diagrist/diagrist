import type { Finding, Rule } from '@diagrist/core';
import type { Graph } from '../graph/model.js';

/** The declarations a rule about them reads, which vocabularies and concept pictures both have. */
export type Declared = Pick<Graph, 'types' | 'links'>;

export const linkTypes: Rule<Declared> = {
  code: 'M112',
  severity: 'error',
  doc: 'A link lists the types it joins with `from=` and `to=`, each a declared type.',
  check: (m) =>
    [...m.links.values()].flatMap((link): Finding[] => {
      if (!('file' in link.origin)) return [];
      const span = link.origin.file;
      return (['from', 'to'] as const).flatMap((side): Finding[] => {
        const names = link[side];
        if (names.length === 0) return [{ span, values: { link: link.id, side, case: 'none', type: '' } }];
        return names
          .filter((t) => !m.types.has(t))
          .map((t) => ({ span, values: { link: link.id, side, case: 'unknown', type: t } }));
      });
    }),
};
