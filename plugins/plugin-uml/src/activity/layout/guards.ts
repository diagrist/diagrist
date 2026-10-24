import type { Flow } from '../diagram.js';
import { ACT, SIZE, type XY } from './metrics.js';
import type { PlacedNode, Placement } from './place.js';
import type { ActivityText } from './regions.js';
import type { Routed } from './route.js';

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

/**
 * A guard near the start of its edge. Out of a diamond at the side: above the horizontal piece, where its own line
 * never crosses it. Out at the bottom: beside the vertical piece just below the tip, on the side no neighbouring
 * branch takes.
 */
function placeGuard(text: string, p: readonly XY[], side: 1 | -1, route: number): GuardText | undefined {
  const g = ACT.guardGap;
  const [a, b] = [p[0], p[1]];
  if (!a || !b) return undefined;
  if (a[1] === b[1]) {
    const dir = Math.sign(b[0] - a[0]) || 1;
    return { text, x: a[0] + dir * g, y: a[1] - g, anchor: dir > 0 ? 'start' : 'end', route };
  }
  const down = Math.sign(b[1] - a[1]) || 1;
  const y = down > 0 ? a[1] + g + SIZE.label : a[1] - g;
  return { text, x: a[0] + side * g, y, anchor: side > 0 ? 'start' : 'end', route };
}

/** Guards and weights of all edges, in the order of the routes. */
export function guardTexts(routes: readonly Routed[]): GuardText[] {
  return routes.flatMap((r, i) => {
    const text = guardLabel(r.flow);
    if (!text || r.points.length < 2) return [];
    const others = routes.filter((o) => o !== r && o.flow.from === r.flow.from);
    const right = others.some((o) => o.fromSide === 'right');
    const left = others.some((o) => o.fromSide === 'left');
    const placed = placeGuard(text, r.points, right && !left ? -1 : 1, i);
    return placed ? [placed] : [];
  });
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
