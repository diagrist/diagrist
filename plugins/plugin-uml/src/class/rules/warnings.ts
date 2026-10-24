import type { Finding } from '@diagrist/core';
import { implementing } from '../../spec/catalog.js';
import { CLASSES } from '../../spec/classes.js';
import type { ClassModel } from '../model.js';
import { packagesAround } from '../model.js';
import { defineRule, relationText } from './shared.js';

const OBJECT_ENDS = new Set(['association', 'directed', 'aggregation', 'composition']);

export const associationMultiplicity = implementing(
  { uml: [CLASSES.multiplicity] },
  defineRule(
    'U910',
    'warning',
    'UML allows ends without multiplicity; exam practice, like the learning platform, asks for both ends of an association, aggregation or composition. A leg of an n-ary association needs it at the class end only.',
    (m) =>
      m.diagram.relations.flatMap((r): Finding[] => {
        if (!OBJECT_ENDS.has(r.kind) || r.from === r.to) return [];
        const end = (id: string, count: string | undefined) => (count || m.associations.has(id) ? [] : [id]);
        const missing = [...end(r.from, r.source), ...end(r.to, r.card)];
        return missing.length
          ? [{ span: r.span, values: { relation: relationText(r), ends: missing.join(', ') } }]
          : [];
      }),
  ),
);

export const ambiguousPair = implementing(
  { uml: [CLASSES.association, CLASSES.roleName] },
  defineRule(
    'U911',
    'warning',
    'Two relations between the same classifiers can only be told apart by a name or a role.',
    (m) => {
      const seen = new Map<string, number>();
      return m.diagram.relations.flatMap((r): Finding[] => {
        if (r.kind === 'generalization' || r.kind === 'realization') return [];
        const pair = [r.from, r.to].sort().join('|');
        const count = (seen.get(pair) ?? 0) + 1;
        seen.set(pair, count);
        return count > 1 && !r.label && !r.role && !r.srole ? [{ span: r.span, values: { a: r.from, b: r.to } }] : [];
      });
    },
  ),
);

/** The package of an end: the package itself, or the package of the classifier. */
const packageOf = (m: ClassModel, id: string): string | undefined =>
  m.packages.has(id) ? id : packagesAround(m, id)[0];

/** Does `goal` lie on a way from `start` along the dependencies? */
function reaches(edges: ReadonlyMap<string, ReadonlySet<string>>, start: string, goal: string): boolean {
  const seen = new Set<string>();
  const todo = [start];
  for (let n = todo.pop(); n !== undefined; n = todo.pop()) {
    if (n === goal) return true;
    if (seen.has(n)) continue;
    seen.add(n);
    todo.push(...(edges.get(n) ?? []));
  }
  return false;
}

export const packageCycle = implementing(
  { uml: [CLASSES.package] },
  defineRule(
    'U912',
    'warning',
    'Packages should depend on each other without cycles (acyclic dependencies principle). Dependencies `-->` between packages and between classifiers of different packages count; UML allows cycles, so it is a warning, once per cycle.',
    (m) => {
      const deps = m.diagram.relations.flatMap((r) => {
        const [a, b] = r.kind === 'dependency' ? [packageOf(m, r.from), packageOf(m, r.to)] : [];
        return a && b && a !== b ? [{ r, a, b }] : [];
      });
      const edges = new Map<string, Set<string>>();
      for (const { a, b } of deps) edges.set(a, new Set([...(edges.get(a) ?? []), b]));
      const reported = new Set<string>();
      return deps.flatMap(({ r, a, b }): Finding[] => {
        if (!reaches(edges, b, a)) return [];
        const cycle = [...edges.keys()].filter((p) => reaches(edges, p, a) && reaches(edges, a, p)).sort();
        const key = cycle.join('|');
        if (reported.has(key)) return [];
        reported.add(key);
        return [{ span: r.span, values: { packages: cycle.join(', ') } }];
      });
    },
  ),
);

export const emptyPackage = implementing(
  { uml: [CLASSES.package] },
  defineRule(
    'U913',
    'warning',
    'A package without classifiers, also in its nested packages, has no frame: it is not drawn, and relations to it are left out.',
    (m) =>
      m.diagram.packages.flatMap((p): Finding[] => {
        const filled = [...m.diagram.classifiers, ...m.diagram.associations].some((c) =>
          packagesAround(m, c.id).includes(p.id),
        );
        return filled ? [] : [{ span: p.span, values: { id: p.id, label: p.label } }];
      }),
  ),
);

export const naryEnds = implementing(
  { uml: [CLASSES.naryAssociation] },
  defineRule(
    'U917',
    'warning',
    'An n-ary association joins three or more ends. With two legs it is a binary association, drawn as a line without diamond.',
    (m) =>
      m.diagram.associations.flatMap((a): Finding[] => {
        const legs = m.diagram.relations.filter((r) => (r.from === a.id) !== (r.to === a.id)).length;
        return legs >= 3 ? [] : [{ span: a.span, values: { id: a.id, legs: String(legs) } }];
      }),
  ),
);

export const naryLeg = implementing(
  { uml: [CLASSES.naryAssociation] },
  defineRule(
    'U918',
    'warning',
    'A leg of an n-ary association is a line from the diamond to a class: `--`, or `->` towards the class. Name and association class belong to the diamond, multiplicity and role to the class end; aggregation and composition exist only between two ends.',
    (m) =>
      m.diagram.relations.flatMap((r): Finding[] => {
        const [a, b] = [m.associations.has(r.from), m.associations.has(r.to)];
        if (!a && !b) return [];
        const [count, role] = a ? [r.source, r.srole] : [r.card, r.role];
        const problem =
          a && b
            ? 'twoDiamonds'
            : r.kind !== 'association' && r.kind !== 'directed'
              ? 'kind'
              : r.kind === 'directed' && !a
                ? 'towardDiamond'
                : r.via !== undefined
                  ? 'via'
                  : count !== undefined || role !== undefined
                    ? 'endAtDiamond'
                    : r.nonav === 'both' || r.nonav === (a ? 'from' : 'to')
                      ? 'nonav'
                      : undefined;
        return problem ? [{ span: r.span, values: { case: problem, relation: relationText(r) } }] : [];
      }),
  ),
);
