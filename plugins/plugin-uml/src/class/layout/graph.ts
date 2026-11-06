import type { LayerEdge, LayerGraph } from '@diagrist/layout-grid';
import type { ClassRelation, RelationKind } from '../diagram.js';
import type { ClassModel } from '../model.js';
import { classHeight, classWidth } from './box.js';
import { CLASS } from './metrics.js';

/**
 * How a relation orders the layers: superclasses and interfaces above, the whole above its parts, the user above
 * what it uses. Associations would rather stand side by side, but a class at the end of no other relation may stand
 * above or below its partner where its layer has no room (`free`, layout plan R4, owner decision D3).
 */
const RANK: Readonly<Record<RelationKind, 'up' | 'down' | 'free'>> = {
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
 * above, more below. An association class takes the place above, so its dashed line meets the top vertex.
 */
function naryEdges(m: ClassModel): { legs: Map<ClassRelation, LayerEdge>; tethers: LayerEdge[] } {
  const legs = new Map<ClassRelation, LayerEdge>();
  const count = new Map<string, number>();
  const tethers: LayerEdge[] = [];
  const above = new Set<string>();
  for (const a of m.diagram.associations) {
    if (a.via === undefined || !m.classifiers.has(a.via)) continue;
    tethers.push({ from: a.via, to: a.id, rank: 1 });
    above.add(a.id);
  }
  for (const r of m.diagram.relations) {
    const leg = legOf(m, r);
    if (!leg) continue;
    const i = count.get(leg.diamond) ?? 0;
    count.set(leg.diamond, i + 1);
    const slot = SLOTS[i] === 'above' && above.has(leg.diamond) ? 'below' : (SLOTS[i] ?? 'below');
    legs.set(
      r,
      slot === 'side'
        ? { from: leg.diamond, to: leg.other, rank: 0 }
        : slot === 'below'
          ? { from: leg.diamond, to: leg.other, rank: 1 }
          : { from: leg.other, to: leg.diamond, rank: 1 },
    );
  }
  return { legs, tethers };
}

/**
 * The class diagram as input of the layering, with the area of every box; packages count as ends only when
 * `packages` is set. An association
 * class stands one layer below both ends of its association, in the middle below the line.
 */
export function classGraph(m: ClassModel, packages = false): LayerGraph {
  const nodes = [...m.diagram.classifiers, ...m.diagram.associations].map((c) => c.id);
  const known = (id: string) => nodes.includes(id) || (packages && m.packages.has(id));
  const nary = naryEdges(m);
  const edges = m.diagram.relations.flatMap((r): LayerEdge[] => {
    const leg = nary.legs.get(r);
    if (leg) return [leg];
    const { from, to, via } = r;
    if (!known(from) || !known(to)) return [];
    const tether: LayerEdge[] =
      via !== undefined && nodes.includes(via) && via !== from && via !== to
        ? [
            { from, to: via, rank: 1 },
            { from: to, to: via, rank: 1 },
          ]
        : [];
    const rank = RANK[r.kind];
    if (rank === 'free') return [{ from, to, rank: 'free' }, ...tether];
    return [rank === 'up' ? { from: to, to: from, rank: 1 } : { from, to, rank: 1 }, ...tether];
  });
  const sizes = new Map([
    ...m.diagram.classifiers.map((c) => [c.id, classWidth(c) * classHeight(c)] as const),
    ...m.diagram.associations.map((a) => [a.id, CLASS.naryW * CLASS.naryH] as const),
  ]);
  return { nodes, edges: [...edges, ...nary.tethers], maxPerLayer: CLASS.perLayer, sizes };
}
