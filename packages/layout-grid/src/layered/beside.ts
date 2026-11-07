import type { Point, Rect } from '@diagrist/core';
import type { Side } from '../geometry.js';
import type { Route } from '../layout.js';
import type { Frame } from './geometry.js';
import type { Link } from './links.js';
import type { Ports } from './ports.js';
import type { Ranked } from './rank.js';
import type { LayeredEdge } from './spec.js';

/** The side a route leaves its first box by, or reaches its last box by, from its first or last piece. */
export function sideOf(points: readonly Point[], end: 'from' | 'to'): Side {
  const [a, b] = end === 'from' ? [points[0], points[1]] : [points.at(-2), points.at(-1)];
  if (!a || !b) return 'bottom';
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (end === 'from') return dy > 0 ? 'bottom' : dy < 0 ? 'top' : dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'top' : dy < 0 ? 'bottom' : dx > 0 ? 'left' : 'right';
}

/** Edges between two boxes of one layer: how many run below or above their layer, and the route of each. */
export interface Beside {
  /** The edges that are no neighbours' and run around the boxes between, by id. */
  readonly around: readonly string[];
  /** Tracks the edges beside add to the gap below layer `l`: those below it and those above layer `l + 1`. */
  count(l: number): number;
  /** The ends of the edges that run below, one per box, for the ports to place with the others of its bottom. */
  readonly ends: readonly Link[];
  /** The ends of the edges that run above, `lower` being the box whose top they enter or leave. */
  readonly tops: readonly Link[];
  /** The route of an edge, its ends at the places the ports gave them, else at the middle of each box. */
  route(e: LayeredEdge, frame: Frame, tracks: readonly number[], ports?: Ports): Route | undefined;
}

/**
 * Edges beside each other: between neighbours, with nothing but placeholders between them, a horizontal line
 * between the facing sides at the middle both boxes share, several between the same two boxes two tracks apart
 * around it; otherwise down out of the first box, along a track of its own below the other tracks of the gap, and
 * up into the second box, or, for the edges of `up`, up out of the first box along a track of its own just above
 * the layer and down into the second (layout plan R3, the side to bend to). Each end stands at the port it took
 * among the others of its side. Above the first layer the tracks stand `lead` above its top.
 */
export function besideRoutes(
  ranked: Ranked,
  layers: readonly (readonly string[])[],
  up: ReadonlySet<string> = new Set(),
  lead = 0,
): Beside {
  const layerOf = (e: LayeredEdge) => ranked.layerOf.get(e.from) ?? 0;
  const neighbours = (e: LayeredEdge) => {
    const layer = layers[layerOf(e)] ?? [];
    const [i, j] = [layer.indexOf(e.from), layer.indexOf(e.to)].sort((a, b) => a - b) as [number, number];
    return layer.slice(i + 1, j).every((n) => ranked.dummies.has(n));
  };
  const pair = (e: LayeredEdge) => [e.from, e.to].sort().join('\u0000');
  const around = ranked.beside.filter((e) => e.hidden !== true && !neighbours(e));
  const under = around.filter((e) => !up.has(e.id));
  const over = around.filter((e) => up.has(e.id));
  const linksOf = (list: readonly LayeredEdge[], dl: number) =>
    list.flatMap((e): Link[] => [
      { edge: `${e.id}:from`, upper: e.from, lower: e.to, gap: layerOf(e) + dl },
      { edge: `${e.id}:to`, upper: e.to, lower: e.from, gap: layerOf(e) + dl },
    ]);
  const ends = linksOf(under, 0);
  const tops = linksOf(over, -1).map((l) => ({ ...l, upper: l.lower, lower: l.upper }));
  const portOf = (id: string, r: Rect, ports: Ports | undefined) => {
    const below = ends.find((l) => l.edge === id);
    const above = tops.find((l) => l.edge === id);
    return (below && ports?.bottom.get(below)) ?? (above && ports?.top.get(above)) ?? Math.round(r.x + r.w / 2);
  };
  const inLayer = (list: readonly LayeredEdge[], l: number) => list.filter((e) => layerOf(e) === l);
  const tops0 = (frame: Frame) => Math.min(...(layers[0] ?? []).map((n) => frame.rects.get(n)?.y ?? 0));
  return {
    around: around.map((e) => e.id),
    count: (l) => inLayer(under, l).length + inLayer(over, l + 1).length,
    ends,
    tops,
    route: (e, frame, tracks, ports) => {
      const a = frame.rects.get(e.from);
      const b = frame.rects.get(e.to);
      if (!a || !b) return undefined;
      const l = layerOf(e);
      let points: Point[];
      if (neighbours(e)) {
        const twins = ranked.beside.filter((u) => u.hidden !== true && pair(u) === pair(e) && neighbours(u));
        const boxes = new Map([
          [e.from, a],
          [e.to, b],
        ]);
        const y = twinHeights(twins, boxes, 2 * frame.track)[twins.indexOf(e)] ?? 0;
        points =
          a.x < b.x
            ? [
                [a.x + a.w, y],
                [b.x, y],
              ]
            : [
                [a.x, y],
                [b.x + b.w, y],
              ];
      } else if (up.has(e.id)) {
        const k = inLayer(over, l).indexOf(e);
        const ty =
          l === 0
            ? tops0(frame) - lead - (inLayer(over, 0).length - 1 - k) * frame.track
            : (frame.gapTop[l - 1] ?? 0) +
              (frame.first[l - 1] ?? 0) +
              ((tracks[l - 1] ?? 0) + inLayer(under, l - 1).length + k) * frame.track;
        const [xa, xb] = [portOf(`${e.id}:from`, a, ports), portOf(`${e.id}:to`, b, ports)];
        points = [
          [xa, a.y],
          [xa, ty],
          [xb, ty],
          [xb, b.y],
        ];
      } else {
        const k = inLayer(under, l).indexOf(e);
        const ty = (frame.gapTop[l] ?? 0) + (frame.first[l] ?? 0) + ((tracks[l] ?? 0) + k) * frame.track;
        const [xa, xb] = [portOf(`${e.id}:from`, a, ports), portOf(`${e.id}:to`, b, ports)];
        points = [
          [xa, a.y + a.h],
          [xa, ty],
          [xb, ty],
          [xb, b.y + b.h],
        ];
      }
      return {
        edge: e.id,
        points,
        shape: 'orthogonal',
        fromSide: sideOf(points, 'from'),
        toSide: sideOf(points, 'to'),
      };
    },
  };
}

/**
 * The heights of lines between the facing sides of neighbours `a` and `b`, by box id, in the order of `twins`:
 * around the middle of the band both boxes share, `most` apart or closer where the band is short. An end that stands
 * for a frame (`LayeredEdge.framed`) is cut at the frame's outline and holds its line to no band of its box: where
 * one box holds every line, the lines spread over its band instead, as long as each stays within the band of the
 * ends it is held by, so a line out of a frame and a line into a small box in it stand apart.
 */
function twinHeights(twins: readonly LayeredEdge[], boxes: ReadonlyMap<string, Rect>, most: number): number[] {
  const band = (rects: readonly Rect[]): [number, number] => [
    Math.max(...rects.map((r) => r.y)),
    Math.min(...rects.map((r) => r.y + r.h)),
  ];
  const spread = ([top, bottom]: [number, number]) => {
    const apart = twins.length < 2 ? 0 : Math.min(most, (bottom - top) / (twins.length + 1));
    return twins.map((_, i) => Math.round((top + bottom) / 2 + (i - (twins.length - 1) / 2) * apart));
  };
  const held = (e: LayeredEdge) =>
    (['from', 'to'] as const).flatMap((end) => (e.framed?.[end] === undefined ? [e[end]] : []));
  const plain = spread(band([...boxes.values()]));
  const all = [...boxes.keys()].filter((id) => twins.every((e) => held(e).includes(id)));
  if (all.length !== 1 || twins.every((e) => held(e).length === 2)) return plain;
  const wide = spread(band(all.flatMap((id) => boxes.get(id) ?? [])));
  const fits = twins.every((e, i) => {
    const [top, bottom] = band(held(e).flatMap((id) => boxes.get(id) ?? []));
    const y = wide[i] ?? 0;
    return y >= top && y <= bottom;
  });
  return fits ? wide : plain;
}
