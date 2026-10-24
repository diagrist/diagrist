import type { Finding } from '@diagrist/core';
import { implementing } from '../../spec/catalog.js';
import { CLASSES } from '../../spec/classes.js';
import type { ClassRelation } from '../diagram.js';
import { ASSOCIATIONS, defineRule, labelOf, relationText } from './shared.js';

export const realizationTarget = implementing(
  { uml: [CLASSES.interfaceRealization] },
  defineRule(
    'U410',
    'error',
    'A realization `--|>` runs from a class or enumeration to an interface: its target is an interface, its source is none.',
    (m) =>
      m.diagram.relations.flatMap((r): Finding[] => {
        if (r.kind !== 'realization') return [];
        const [from, to] = [m.classifiers.get(r.from), m.classifiers.get(r.to)];
        const at = (kind: string, id: string) => ({
          span: r.span,
          values: { case: kind, relation: relationText(r), label: labelOf(m, id) },
        });
        return [
          ...(to && to.kind !== 'interface' ? [at('target', r.to)] : []),
          ...(from?.kind === 'interface' ? [at('source', r.from)] : []),
        ];
      }),
  ),
);

/** First generalization of every cycle, by a depth-first search in source order. */
function cycles(relations: readonly ClassRelation[]): ClassRelation[] {
  const gens = relations.filter((r) => r.kind === 'generalization' && r.from !== r.to);
  const state = new Map<string, 'open' | 'done'>();
  const found: ClassRelation[] = [];
  const visit = (id: string): void => {
    state.set(id, 'open');
    for (const r of gens.filter((g) => g.from === id)) {
      if (state.get(r.to) === 'open') found.push(r);
      else if (!state.has(r.to)) visit(r.to);
    }
    state.set(id, 'done');
  };
  for (const r of gens) if (!state.has(r.from)) visit(r.from);
  return found;
}

export const generalization = implementing(
  { uml: [CLASSES.generalization] },
  defineRule(
    'U411',
    'error',
    'A generalization `-|>` joins classifiers of one kind (class with class, interface with interface) and runs in no cycle; the triangle points at the more general one. A class implements an interface with `--|>`.',
    (m) => {
      const cyclic = cycles(m.diagram.relations).map((r) => ({
        span: r.span,
        values: { case: 'cycle', relation: relationText(r) },
      }));
      const mixed = m.diagram.relations.flatMap((r): Finding[] => {
        const [from, to] = [m.classifiers.get(r.from), m.classifiers.get(r.to)];
        if (r.kind !== 'generalization' || !from || !to) return [];
        if (r.from === r.to) return [{ span: r.span, values: { case: 'self', relation: relationText(r) } }];
        if (from.kind === to.kind) return [];
        const kind = to.kind === 'interface' ? 'interface' : 'kinds';
        return [{ span: r.span, values: { case: kind, relation: relationText(r), from: from.label, to: to.label } }];
      });
      return [...cyclic, ...mixed];
    },
  ),
);

const TYPE_LEVEL = new Set(['generalization', 'realization', 'dependency']);

export const typeLevelEnds = implementing(
  { uml: [CLASSES.dependency, CLASSES.generalization, CLASSES.interfaceRealization] },
  defineRule(
    'U414',
    'error',
    'Generalization, realization and dependency join types, not objects: their ends have no multiplicity and no role.',
    (m) =>
      m.diagram.relations.flatMap((r): Finding[] =>
        TYPE_LEVEL.has(r.kind) && [r.source, r.card, r.role, r.srole].some((x) => x !== undefined)
          ? [{ span: r.span, values: { relation: relationText(r) } }]
          : [],
      ),
  ),
);

/** Does a multiplicity allow more than one object? `*`, `0..*`, `2`, `1..5`. */
const many = (text: string): boolean => {
  const upper = text.split('..').at(-1) ?? text;
  return upper === '*' || Number(upper) > 1;
};

export const compositeEnd = implementing(
  { uml: [CLASSES.composition] },
  defineRule(
    'U415',
    'error',
    'A part belongs to at most one whole at a time: the multiplicity at the whole of a composition `*--` is `1` or `0..1`.',
    (m) =>
      m.diagram.relations.flatMap((r): Finding[] =>
        r.kind === 'composition' && r.source !== undefined && many(r.source)
          ? [{ span: r.span, values: { relation: relationText(r), source: r.source } }]
          : [],
      ),
  ),
);

export const navigability = implementing(
  { uml: [CLASSES.navigability, CLASSES.nonNavigable] },
  defineRule(
    'U470',
    'error',
    'An end is navigable (open head), not navigable (x) or open. An x at an end with an arrowhead contradicts itself, and generalization, realization and dependency have no navigable ends.',
    (m) =>
      m.diagram.relations.flatMap((r): Finding[] => {
        const x = r.nonav;
        if (x === undefined) return [];
        const relation = relationText(r);
        if (!ASSOCIATIONS.has(r.kind)) return [{ span: r.span, values: { case: 'kind', relation } }];
        const headed = [
          ...(x !== 'to' && r.kind === 'bidirectional' ? [r.from] : []),
          ...(x !== 'from' && (r.kind === 'directed' || r.kind === 'bidirectional') ? [r.to] : []),
        ];
        return headed.length
          ? [{ span: r.span, values: { case: 'head', relation, ends: headed.join(', '), nonav: x } }]
          : [];
      }),
  ),
);
