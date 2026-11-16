import type { Rect } from '@diagrist/core';
import type { EdgeLabel } from '@diagrist/layout-grid';
import type { Look } from '../../looks/look.js';
import type { ArchitectureModel } from '../../model/types.js';
import type { Head } from '../frame-cell.js';
import type { StarRoom } from '../spacing.js';
import { hull, meets } from './geometry.js';
import { placeTexts } from './labels.js';
import { coveredBy, linesOf, type StarLine } from './lines.js';
import { coverOf, type Placement, placeRing, type Ring, type Spot, type UnitShapes } from './place.js';
import type { Shape } from './shapes.js';
import { type StarSigns, signsOfStar } from './signs.js';

/** The room between a frame and what is not in it, in shares of the room between neighbours. */
const FRAME_GAP = 0.6;
/** Width to height of the ring, tried in this order. */
const ASPECTS = [1.4, 1.8, 2.3, 1.1, 2.9];
/** How many sizes a ring tries once one fits, for texts that find a clearer spot on a larger ring. */
const BEYOND = 6;
/** How much larger the next size of the ring is. */
const GROW = 1.06;
/** What it costs a unit of people to stand on the right or at the bottom, in shares of the picture's area. */
const PEOPLE_AWAY = 0.6;
/** What a step of strain on a text costs, in shares of the picture's area. */
const STRAIN = 0.1;

/** A laid out star: placement, lines, texts and signs, and the rectangle all of it covers. */
export interface Star {
  readonly placed: Placement;
  readonly lines: readonly StarLine[];
  readonly labels: readonly EdgeLabel[];
  readonly signs: StarSigns;
  readonly bounds: Rect;
  /** How much closer than wished texts came to lines they do not belong to. */
  readonly strain: number;
}

/** Whether nodes of different units and frames keep their room from each other, and all of them from the hub. */
function roomy(placed: Placement, hub: string, room: StarRoom): boolean {
  const spots = [...placed.spots.entries()];
  const middle = coverOf(placed.spots.get(hub) as Spot);
  const frameGap = room.gap * FRAME_GAP;
  if (spots.some(([id, s]) => id !== hub && coverOf(s).some((r) => middle.some((q) => meets(r, q, room.ring)))))
    return false;
  for (let i = 0; i < spots.length; i++)
    for (let k = i + 1; k < spots.length; k++) {
      const [, a] = spots[i] as (typeof spots)[number];
      const [, b] = spots[k] as (typeof spots)[number];
      if (a.unit !== undefined && a.unit === b.unit) continue;
      if (coverOf(a).some((r) => coverOf(b).some((q) => meets(r, q, room.gap)))) return false;
    }
  return placed.frames.every(
    (f) =>
      placed.frames.every((g) => g === f || !meets(f.rect, g.rect, frameGap)) &&
      spots.every(([id, s]) => f.members.includes(id) || !coverOf(s).some((r) => meets(r, f.rect, frameGap))),
  );
}

/** The star for one ring, or undefined when its nodes, lines or texts do not find room. */
function tryRing(
  model: ArchitectureModel,
  hub: Shape,
  units: readonly UnitShapes[],
  ring: Ring,
  look: Look,
  heads: ReadonlyMap<string, Head>,
  room: StarRoom,
): Star | undefined {
  const placed = placeRing(hub, units, ring, look, heads, room);
  if (!roomy(placed, hub.node.id, room)) return undefined;
  const lines = linesOf(model.edges, placed, hub.node.id);
  if (lines.some((l) => !l.clear)) return undefined;
  const rects = new Map([...placed.spots].map(([id, s]) => [id, { x: s.x, y: s.y, w: s.shape.w, h: s.shape.h }]));
  const boxes = coveredBy(placed);
  const signs = signsOfStar(model, lines, look, rects, boxes);
  const routeOf = new Map(lines.map((l, i) => [l.edge.index, i]));
  const around = {
    boxes: [...boxes, ...signs.rects],
    frames: placed.frames.map((f) => f.rect),
    lines: lines.map((l) => l.points),
  };
  const texts = placeTexts(lines, look, routeOf, around, room, ring.turn);
  if (!texts) return undefined;
  const { labels, strain } = texts;
  const bounds = hull([...boxes, ...placed.frames.map((f) => f.rect), ...labels.map((l) => l.box), ...signs.rects]);
  return { placed, lines, labels, signs, bounds, strain };
}

/** How far a unit is tried closer to the hub, in shares of its way there, nearest first. */
const PULL = [0.7, 0.78, 0.86, 0.94];

type Tried = { readonly star: Star; readonly ring: Ring; readonly cost: number };

/**
 * The star with each unit drawn as close to the hub as nodes, lines and texts allow without costing more, so a ring
 * that had to grow for one tight spot leaves no hole elsewhere; units that set `distance=` keep their place.
 */
function drawnIn(best: Tried, units: readonly UnitShapes[], fit: (ring: Ring) => Tried | undefined): Tried {
  let now = best;
  units.forEach((u, i) => {
    if (u.unit.reach !== undefined) return;
    for (const pull of PULL) {
      const reach = (now.ring.reach ?? []).map((r, k) => (k === i ? r * pull : r));
      const tried = fit({ ...now.ring, reach });
      if (tried && tried.cost <= now.cost) {
        now = tried;
        return;
      }
    }
  });
  return now;
}

/** What a star costs: the area it covers, more where people stand on the right or at the bottom and texts crowd lines. */
function costOf(star: Star, units: readonly UnitShapes[]): number {
  const away = star.placed.angles.filter(
    (a, i) => units[i]?.unit.people === true && (Math.cos(a) > 0.2 || Math.sin(a) > 0.2),
  ).length;
  return star.bounds.w * star.bounds.h * (1 + PEOPLE_AWAY * away + STRAIN * star.strain);
}

/**
 * The most compact star: every start angle in half steps of the ring, both ways round and several widths to heights,
 * each grown from small until nodes, lines and texts find room and a few sizes beyond; a ring stops growing once it
 * costs more than the best.
 */
export function bestStar(
  model: ArchitectureModel,
  hub: Shape,
  units: readonly UnitShapes[],
  look: Look,
  heads: ReadonlyMap<string, Head>,
  room: StarRoom,
): Star | undefined {
  const n = Math.max(1, units.length);
  const reach = units.map((u) => u.unit.reach ?? 1);
  let best: { star: Star; ring: Ring; cost: number } | undefined;
  const start = hub.h / 2 + look.metrics.nodeH;
  for (const aspect of ASPECTS)
    for (let k = 0; k < 2 * n; k++)
      for (const turn of [1, -1] as const) {
        const theta = Math.PI + (k * Math.PI) / n;
        let more = BEYOND;
        for (let scale = start; scale < 4000 && more > 0; scale *= GROW) {
          const floor = scale * aspect * scale;
          if (best && floor > best.cost) break;
          const ring = { theta, turn, aspect, scale, reach };
          const star = tryRing(model, hub, units, ring, look, heads, room);
          if (!star) continue;
          more -= 1;
          const cost = costOf(star, units);
          if (!best || cost < best.cost) best = { star, ring, cost };
        }
      }
  if (!best) return undefined;
  const fit = (ring: Ring) => {
    const star = tryRing(model, hub, units, ring, look, heads, room);
    return star ? { star, ring, cost: costOf(star, units) } : undefined;
  };
  return drawnIn(best, units, fit).star;
}
