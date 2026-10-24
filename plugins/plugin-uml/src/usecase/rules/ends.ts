import type { Finding } from '@diagrist/core';
import { cycles, defineRule, endKind, relationText } from './shared.js';

export const includeExtendEnds = defineRule(
  'U421',
  'error',
  '`include` and `extend` join two use cases, never an actor (UML 2.5.1, 18.1.3). An actor takes part through an association `--`.',
  (m) =>
    m.diagram.relations.flatMap((r): Finding[] => {
      if (r.kind !== 'include' && r.kind !== 'extend') return [];
      const actor = [r.from, r.to].find((id) => endKind(id, m) === 'actor');
      return actor ? [{ span: r.span, values: { relation: relationText(r), kind: r.kind, actor } }] : [];
    }),
);

export const associationEnds = defineRule(
  'U422',
  'error',
  'An association joins an actor with a use case (UML 2.5.1, 18.1.3): not two actors, not two use cases, not an element with itself.',
  (m) =>
    m.diagram.relations.flatMap((r): Finding[] => {
      if (r.kind !== 'association') return [];
      const [a, b] = [endKind(r.from, m), endKind(r.to, m)];
      if (a === 'unknown' || b === 'unknown' || (a !== b && r.from !== r.to)) return [];
      const kind = r.from === r.to ? 'self' : a === 'actor' ? 'actors' : 'cases';
      return [{ span: r.span, values: { relation: relationText(r), case: kind } }];
    }),
);

export const generalizationEnds = defineRule(
  'U423',
  'error',
  'A generalization joins an actor with an actor or a use case with a use case, never one with itself, and runs in no cycle: the triangle points at the more general one.',
  (m) => {
    const gens = m.diagram.relations.filter((r) => r.kind === 'generalization');
    const found = gens.flatMap((r): Finding[] => {
      const [a, b] = [endKind(r.from, m), endKind(r.to, m)];
      if (r.from === r.to) return [{ span: r.span, values: { relation: relationText(r), case: 'self' } }];
      if (a === 'unknown' || b === 'unknown' || a === b) return [];
      return [{ span: r.span, values: { relation: relationText(r), case: 'mixed' } }];
    });
    const cyclic = cycles(gens.filter((g) => g.from !== g.to)).map((r) => ({
      span: r.span,
      values: { relation: relationText(r), case: 'cycle' },
    }));
    return [...found, ...cyclic];
  },
);

export const includeCycle = defineRule(
  'U425',
  'error',
  'A use case includes itself neither directly nor through others (UML 2.5.1, 18.1.3). The arrow points from the base to the included case.',
  (m) => {
    const includes = m.diagram.relations.filter((r) => r.kind === 'include');
    const own = includes.filter((r) => r.from === r.to);
    return [...own, ...cycles(includes.filter((r) => r.from !== r.to))].map((r) => ({
      span: r.span,
      values: { relation: relationText(r) },
    }));
  },
);
