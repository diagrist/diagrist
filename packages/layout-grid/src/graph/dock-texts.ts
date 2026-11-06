import type { Point, Rect } from '@diagrist/core';
import type { EdgeLabel } from '../label/types.js';
import type { LayeredSpec } from '../layered/spec.js';
import { spotLabels } from '../layered/spots.js';
import type { PlacedGroup, PlacedNode, Route } from '../layout.js';

/**
 * The texts of a picture whose lines through docked nodes were cut apart: a text of such a line was seated for the
 * whole line and may stand at the part it does not belong to, so it is seated anew over the middle of its own part's
 * longest piece and found a clear spot from there by the one spot search (`spotLabels`), and where its part has none
 * it stays where the stages set it for the whole line, which they kept clear, as the text of the part it stands at
 * (`cut` names the other part of each); every other text stays where it is
 * while that is clear, now of the docked nodes and of lines that the stages took for one, both laid out to a host.
 */
export function respotTexts(
  spec: LayeredSpec,
  drawn: {
    readonly routes: readonly Route[];
    readonly nodes: readonly PlacedNode[];
    readonly frames: readonly PlacedGroup[];
  },
  labels: readonly EdgeLabel[],
  cut: ReadonlyMap<number, number>,
): EdgeLabel[] {
  const kept = labels.filter((l) => !cut.has(l.route));
  const chained = new Set(drawn.routes.flatMap((r, i) => (cut.has(i) ? [] : [r.edge])));
  const rects = new Map(drawn.nodes.map((n) => [n.id, n.rect]));
  const picture = { routes: drawn.routes, rects, frames: drawn.frames, width: Number.MAX_SAFE_INTEGER, bottom: 0 };
  const found = spotLabels(spec, picture, kept, chained);
  const back = new Set(found.crowded.filter((i) => cut.has(i)));
  const owner = (i: number) => {
    const own = labels.filter((l) => l.route === i).map((l) => l.box);
    const twin = cut.get(i) ?? i;
    const near = (k: number) => Math.min(...own.map((b) => distance(b, drawn.routes[k]?.points ?? [])));
    return near(twin) < near(i) ? twin : i;
  };
  const owners = new Map([...back].map((i) => [i, owner(i)]));
  return [
    ...found.labels.filter((l) => !back.has(l.route)),
    ...labels.flatMap((l) => (back.has(l.route) ? [{ ...l, route: owners.get(l.route) ?? l.route }] : [])),
  ];
}

/** The least distance between a rectangle and the pieces of a line. */
function distance(r: Rect, points: readonly Point[]): number {
  const gap = (lo: number, hi: number, a: number, b: number) => Math.max(0, Math.min(a, b) - hi, lo - Math.max(a, b));
  return Math.min(
    Number.POSITIVE_INFINITY,
    ...points.slice(1).map((q, i) => {
      const p = points[i] as Point;
      return Math.hypot(gap(r.x, r.x + r.w, p[0], q[0]), gap(r.y, r.y + r.h, p[1], q[1]));
    }),
  );
}
