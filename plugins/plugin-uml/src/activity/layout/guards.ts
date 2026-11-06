import type { Flow } from '../diagram.js';
import { ACT } from './metrics.js';
import type { PlacedNode, Placement, Routed } from './placement.js';
import type { ActivityText } from './regions.js';

/** A guard as drawn, with the index of its edge. */
export interface GuardText extends ActivityText {
  readonly route: number;
}

/** The guard as the picture shows it: in brackets, `else` as the predefined guard; then the weight `{weight=n}`. */
export function guardLabel(f: Flow): string | undefined {
  const guard = f.else ? '[else]' : f.guard ? `[${f.guard}]` : undefined;
  const weight = f.weight === undefined ? undefined : `{weight=${f.weight}}`;
  return guard && weight ? `${guard} ${weight}` : (guard ?? weight);
}

/** Lift of the question when it stands above an edge with a guard. */
const LIFT = 8;

/**
 * The question at a diamond stands at the top on the side no edge leaves by. When both sides are taken, it stands on
 * the right and a little higher, above the guard of the right edge.
 */
export function placeQuestions(pl: Placement, routes: readonly Routed[]): Placement {
  const nodes = new Map<string, PlacedNode>();
  for (const [id, p] of pl.nodes) {
    const side = p.art.node === 'decision' ? p.art.side : undefined;
    if (!side) {
      nodes.set(id, p);
      continue;
    }
    const used = (s: 'left' | 'right') => routes.some((r) => r.flow.from === id && r.fromSide === s);
    const r = p.rect;
    const moved: ActivityText =
      used('right') && !used('left')
        ? { ...side, x: r.x - ACT.sideGap + r.w / 4, anchor: 'end' }
        : used('right')
          ? { ...side, y: side.y - LIFT }
          : side;
    nodes.set(id, { ...p, art: { ...p.art, side: moved } });
  }
  return { ...pl, nodes };
}
