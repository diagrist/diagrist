import type { Point, Rect } from '@diagrist/core';
import type { EdgeLabel } from '../label/types.js';
import { dockBars } from './bar-docks.js';
import type { Frame } from './geometry.js';
import type { Seat } from './labels.js';
import type { Group, Link } from './links.js';
import type { Ports } from './ports.js';
import type { Ranked } from './rank.js';
import type { LayeredSpec } from './spec.js';

/** The corner a piece leaves or enters its box by, at the middle of that side (`LayeredNode.sides`). */
export type Corner = 'left' | 'right';

/** Pieces at a corner of their box, by which end: the upper one leaves it there, the lower one enters it there. */
export interface Corners {
  readonly upper: ReadonlyMap<Link, Corner>;
  readonly lower: ReadonlyMap<Link, Corner>;
  /** `box|side` for every corner taken, which a rail leaves to the others where it may. */
  readonly taken: ReadonlySet<string>;
}

/** What the docks of a placement are found on: the spec, layers, groups, boxes as they stand, centres. */
export interface DockInput {
  readonly spec: LayeredSpec;
  readonly ranked: Pick<Ranked, 'dummies' | 'layerOf'>;
  readonly layers: readonly (readonly string[])[];
  readonly groups: readonly Group[];
  readonly rects: ReadonlyMap<string, Rect>;
  readonly x: ReadonlyMap<string, number>;
  /** The least straight run of a piece out of a corner. */
  readonly run: number;
}

/**
 * Ends at fixed points (ADR 0039): on a box with `sides` every end on the top or bottom meets at its middle, and of
 * two or more pieces below, or above, the outermost whose other end lies `run` beyond the box leaves, or enters, it
 * at the corner of that side where no box or long line of its layer stands between, the ends on bars first placed by
 * `dockBars`. Moves the ports in place and gives the corners.
 */
export function dockEnds(input: DockInput, ports: Ports): Corners {
  const { spec, ranked, layers, groups, rects, x, run } = input;
  const real = (n: string) => !ranked.dummies.has(n);
  const links = groups.flatMap((g) => g.links);
  const count = new Map<string, number>();
  for (const g of groups)
    for (const k of new Set(g.links.flatMap((l) => [`${l.upper}|bottom`, `${l.lower}|top`])))
      count.set(k, (count.get(k) ?? 0) + 1);
  const bar = new Set(spec.nodes.flatMap((n) => (n.shape === 'bar' ? [n.id] : [])));
  const fits = (n: string, v: number) => {
    const r = rects.get(n);
    return r !== undefined && v >= r.x + Math.min(16, r.w / 4) && v <= r.x + r.w - Math.min(16, r.w / 4);
  };
  const upper = new Map<Link, Corner>();
  const lower = new Map<Link, Corner>();
  const taken = new Set<string>();
  const centre = (n: string) => Math.round(x.get(n) ?? 0);
  const free = (n: string, a: number, b: number) => {
    const layer = layers[ranked.layerOf.get(n) ?? -1] ?? [];
    const [lo, hi] = [Math.min(a, b), Math.max(a, b)];
    return layer.every((k) => {
      const r = rects.get(k);
      const [a, b] = r ? [r.x, r.x + r.w] : [x.get(k) ?? 0, x.get(k) ?? 0];
      return k === n || b < lo - 0.5 || a > hi + 0.5;
    });
  };
  dockBars({ bars: bar, links, real, count, centre, free }, ports);
  for (const node of spec.nodes) {
    if (node.sides === undefined) continue;
    const r = rects.get(node.id);
    if (!r) continue;
    const below = links.filter((l) => l.upper === node.id);
    const above = links.filter((l) => l.lower === node.id);
    for (const [mine, at, there, end, side, into] of [
      [below, ports.bottom, ports.top, (l: Link) => l.lower, 'top', upper],
      [above, ports.top, ports.bottom, (l: Link) => l.upper, 'bottom', lower],
    ] as const) {
      const other = (l: Link) => (real(end(l)) ? there.get(l) : x.get(end(l)));
      for (const l of mine) at.set(l, centre(node.id));
      const sorted = [...mine].sort((a, b) => (other(a) ?? 0) - (other(b) ?? 0));
      const pick = (l: Link | undefined, side: Corner) => {
        const far = l === undefined ? undefined : other(l);
        if (l === undefined || far === undefined || into.has(l) || !node.sides?.includes(side)) return;
        const edge = side === 'left' ? r.x : r.x + r.w;
        const beyond = side === 'left' ? edge - far : far - edge;
        if (beyond < run || !free(node.id, edge, far)) return;
        into.set(l, side);
        at.set(l, Math.round(edge));
        taken.add(`${node.id}|${side}`);
      };
      if (mine.length > 1) {
        pick(sorted[0], 'left');
        pick(sorted.at(-1), 'right');
      }
      for (const l of mine) {
        const n = end(l);
        if (!into.has(l) && real(n) && !bar.has(n) && count.get(`${n}|${side}`) === 1 && fits(n, centre(node.id)))
          there.set(l, centre(node.id));
      }
    }
  }
  return { upper, lower, taken };
}

/** Every bar as wide as its ends reach, `overhang` beyond the outermost, and its own width at least around them. */
export function barRects(
  spec: LayeredSpec,
  rects: Map<string, Rect>,
  links: readonly Link[],
  ports: Ports,
  overhang: number,
): void {
  for (const n of spec.nodes) {
    const r = rects.get(n.id);
    if (n.shape !== 'bar' || !r) continue;
    const xs = links.flatMap((l) => [
      ...(l.upper === n.id ? [ports.bottom.get(l) ?? r.x] : []),
      ...(l.lower === n.id ? [ports.top.get(l) ?? r.x] : []),
    ]);
    if (xs.length === 0) continue;
    const [lo, hi] = [Math.min(...xs) - overhang, Math.max(...xs) + overhang];
    const short = Math.max(0, r.w - (hi - lo)) / 2;
    rects.set(n.id, { ...r, x: lo - short, w: hi - lo + 2 * short });
  }
}

/** The points of a piece with an end at a corner: straight out of the corner and down, or down and into it. */
export function cornerPoints(l: Link, corners: Corners, ports: Ports, frame: Frame): Point[] {
  const a = frame.rects.get(l.upper);
  const b = frame.rects.get(l.lower);
  if (!a || !b) return [];
  const [x1, x2] = [ports.bottom.get(l) ?? a.x, ports.top.get(l) ?? b.x];
  const [ya, yb] = [a.y + a.h / 2, b.y + b.h / 2];
  const [up, down] = [corners.upper.has(l), corners.lower.has(l)];
  if (up && down) {
    const mid = Math.round((x1 + x2) / 2);
    return [
      [x1, ya],
      [mid, ya],
      [mid, yb],
      [x2, yb],
    ];
  }
  if (up)
    return [
      [x1, ya],
      [x2, ya],
      [x2, b.y],
    ];
  return [
    [x1, a.y + a.h],
    [x1, yb],
    [x2, yb],
  ];
}

/**
 * The text of a piece out of or into a corner at its seat: above its horizontal run, `gap` beyond the corner, or
 * undefined where the piece takes no corner.
 */
export function cornerSeat(
  seat: Seat,
  ports: Ports,
  rects: ReadonlyMap<string, Rect>,
  route: number,
  gap: number,
): EdgeLabel[] | undefined {
  const l = seat.group.links.find((k) => k.edge === seat.edge.id) ?? seat.group.links[0];
  const up = l && ports.corners?.upper.get(l);
  const side = up ?? (l && seat.at === 'bottom' ? ports.corners?.lower.get(l) : undefined);
  const r = l && rects.get(up ? l.upper : l.lower);
  const label = seat.edge.label;
  if (!side || !r || !label) return undefined;
  const h = label.size + 2;
  const x = side === 'right' ? r.x + r.w + gap : r.x - gap - label.width;
  const top = r.y + r.h / 2 - gap - h;
  return [
    {
      text: label.text,
      x,
      y: top + label.size,
      anchor: 'start',
      box: { x, y: top, w: label.width, h },
      route,
      part: 'name',
    },
  ];
}
