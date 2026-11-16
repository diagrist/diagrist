import type { Rect } from '@diagrist/core';
import type { EdgeLabel } from '@diagrist/layout-grid';
import type { Look } from '../../looks/look.js';
import type { ArchitectureModel } from '../../model/types.js';
import type { Head } from '../frame-cell.js';
import { hull, meets } from './geometry.js';
import { placeTexts } from './labels.js';
import { coveredBy, linesOf, type StarLine } from './lines.js';
import { coverOf, type Placement, placeRing, type Ring, type UnitShapes } from './place.js';
import type { Shape } from './shapes.js';
import { type StarSigns, signsOfStar } from './signs.js';

/** The room between nodes of different units, and between a frame and what is not in it. */
const GAP = { node: 40, frame: 24 } as const;
/** Width to height of the ring, tried in this order. */
const ASPECTS = [1.4, 1.8, 2.3, 1.1, 2.9];
/** How many sizes a ring tries once one fits, for texts that find a clearer spot on a larger ring. */
const BEYOND = 3;
/** How much larger the next size of the ring is. */
const GROW = 1.06;
/** What it costs a unit of people to stand on the right or at the bottom, in shares of the picture's area. */
const PEOPLE_AWAY = 0.2;
/** What a step of strain on a text costs, in shares of the picture's area. */
const STRAIN = 0.04;

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

/** Whether nodes of different units and frames keep their room from each other. */
function roomy(placed: Placement): boolean {
  const spots = [...placed.spots.entries()];
  for (let i = 0; i < spots.length; i++)
    for (let k = i + 1; k < spots.length; k++) {
      const [, a] = spots[i] as (typeof spots)[number];
      const [, b] = spots[k] as (typeof spots)[number];
      if (a.unit !== undefined && a.unit === b.unit) continue;
      if (coverOf(a).some((r) => coverOf(b).some((q) => meets(r, q, GAP.node)))) return false;
    }
  return placed.frames.every(
    (f) =>
      placed.frames.every((g) => g === f || !meets(f.rect, g.rect, GAP.frame)) &&
      spots.every(([id, s]) => f.members.includes(id) || !coverOf(s).some((r) => meets(r, f.rect, GAP.frame))),
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
): Star | undefined {
  const placed = placeRing(hub, units, ring, look, heads);
  if (!roomy(placed)) return undefined;
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
  const texts = placeTexts(lines, look, routeOf, around);
  if (!texts) return undefined;
  const { labels, strain } = texts;
  const bounds = hull([...boxes, ...placed.frames.map((f) => f.rect), ...labels.map((l) => l.box), ...signs.rects]);
  return { placed, lines, labels, signs, bounds, strain };
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
): Star | undefined {
  const n = Math.max(1, units.length);
  let best: { star: Star; cost: number } | undefined;
  const start = hub.h / 2 + look.metrics.nodeH;
  for (const aspect of ASPECTS)
    for (let k = 0; k < 2 * n; k++)
      for (const turn of [1, -1] as const) {
        const theta = Math.PI + (k * Math.PI) / n;
        let more = BEYOND;
        for (let scale = start; scale < 4000 && more > 0; scale *= GROW) {
          const floor = scale * aspect * scale;
          if (best && floor > best.cost) break;
          const star = tryRing(model, hub, units, { theta, turn, aspect, scale }, look, heads);
          if (!star) continue;
          more -= 1;
          const cost = costOf(star, units);
          if (!best || cost < best.cost) best = { star, cost };
        }
      }
  return best?.star;
}
