import type { GraphRank } from '@diagrist/layout-grid';
import type { ClassRelation, RelationKind } from '../diagram.js';
import type { ClassModel } from '../model.js';

/**
 * How a relation orders the layers: superclasses and interfaces above, the whole above its parts, the user above
 * what it uses. Associations would rather stand side by side, but a class at the end of no other relation may stand
 * above or below its partner where its layer has no room (`free`, layout plan R4, owner decision D3).
 */
const RANK: Readonly<Record<RelationKind, GraphRank>> = {
  generalization: 'up',
  realization: 'up',
  composition: 'down',
  aggregation: 'down',
  dependency: 'down',
  association: 'free',
  directed: 'free',
  bidirectional: 'free',
};

/** Places around the diamond in the order of its legs; from the fifth leg on, further below. */
const SLOTS = ['side', 'side', 'below', 'above'] as const;

/** A leg of an n-ary association: its diamond and the class at the other end, whichever way it is written. */
export function legOf(m: ClassModel, r: ClassRelation): { diamond: string; other: string } | undefined {
  const [a, b] = [m.associations.has(r.from), m.associations.has(r.to)];
  if (a && !b && m.classifiers.has(r.to)) return { diamond: r.from, other: r.to };
  if (b && !a && m.classifiers.has(r.from)) return { diamond: r.to, other: r.from };
  return undefined;
}

/**
 * The diamond stands among its ends: the first two classes left and right in its layer, the third below, the fourth
 * above, more below. An association class takes the place above, so its dashed line meets the top vertex. The rank of
 * each leg as it is drawn, from `r.from` to `r.to`.
 */
function legRanks(m: ClassModel): Map<ClassRelation, GraphRank> {
  const legs = new Map<ClassRelation, GraphRank>();
  const count = new Map<string, number>();
  const above = new Set(
    m.diagram.associations.flatMap((a) => (a.via !== undefined && m.classifiers.has(a.via) ? [a.id] : [])),
  );
  for (const r of m.diagram.relations) {
    const leg = legOf(m, r);
    if (!leg) continue;
    const i = count.get(leg.diamond) ?? 0;
    count.set(leg.diamond, i + 1);
    const slot = SLOTS[i] === 'above' && above.has(leg.diamond) ? 'below' : (SLOTS[i] ?? 'below');
    const down = slot === 'below' ? r.from === leg.diamond : r.from !== leg.diamond;
    legs.set(r, slot === 'side' ? 'beside' : down ? 'down' : 'up');
  }
  return legs;
}

/**
 * How each relation orders the layers, as it is drawn from `from` to `to`: by its kind (`RANK`), a leg of an n-ary
 * association by its place around the diamond.
 */
export function ranksOf(m: ClassModel): (r: ClassRelation) => GraphRank {
  const legs = legRanks(m);
  return (r) => legs.get(r) ?? RANK[r.kind];
}
