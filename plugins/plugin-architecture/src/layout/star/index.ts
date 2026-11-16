import type { Point, Rect } from '@diagrist/core';
import { type CellLayout, type EdgeLabel, placedOf, type Route, type Side } from '@diagrist/layout-grid';
import type { Look } from '../../looks/look.js';
import type { ArchitectureModel } from '../../model/types.js';
import type { Texts } from '../../texts/index.js';
import type { Head } from '../frame-cell.js';
import { MARK, NUMBER_SIZE } from '../marks.js';
import { rounded } from './geometry.js';
import { hubOf, ringOrder, unitsOf } from './order.js';
import { bestStar, type Star } from './search.js';
import { shapeOf } from './shapes.js';

/** How far above the first row of a grid a star may reach, as texts above the top nodes need. */
const RISE = 32;

/** The side of a box a line leaves through, by the direction of its first piece. */
function sideOf(a: Point, b: Point): Side {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'bottom' : 'top';
}

const moved = (r: Rect, dx: number, dy: number): Rect => ({ ...r, x: r.x + dx, y: r.y + dy });

/** A laid out star as the grid would hand its picture over, shifted to stand below the header at the margin. */
function asCells(model: ArchitectureModel, star: Star, look: Look, top: number): CellLayout {
  const m = look.metrics;
  const dx = m.marginX - star.bounds.x;
  const dy = top - star.bounds.y;
  const shift = (p: readonly Point[]) => rounded(p.map(([x, y]): Point => [x + dx, y + dy]));
  const routes = star.lines.map((l): Route => {
    const points = shift(l.points);
    const n = points.length;
    return {
      edge: String(l.edge.index),
      points,
      shape: n === 2 ? 'straight' : 'loop',
      fromSide: sideOf(points[0] as Point, points[1] as Point),
      toSide: sideOf(points[n - 1] as Point, points[n - 2] as Point),
    };
  });
  const labels = star.labels.map((l): EdgeLabel => ({ ...l, x: l.x + dx, y: l.y + dy, box: moved(l.box, dx, dy) }));
  const nodes = [...star.placed.spots.values()].map((s) => ({
    id: s.shape.node.id,
    rect: { x: s.x + dx, y: s.y + dy, w: s.shape.w, h: s.shape.h },
    col: 0,
    row: 0,
  }));
  const groups = star.placed.frames.map((f) => ({ id: f.id, rect: moved(f.rect, dx, dy) }));
  const sign = <S extends { x: number; y: number }>(s: S): S => ({ ...s, x: s.x + dx, y: s.y + dy });
  const grid = {
    cols: [],
    rows: [],
    gutters: { cols: [], rows: [] },
    nodes,
    groups,
    width: star.bounds.w + 2 * m.marginX,
    bottom: top + star.bounds.h + m.groupPadBottom,
  };
  const numbers = star.signs.numbers.map(sign);
  const pins = star.signs.pins.map(sign);
  const size = NUMBER_SIZE[look.options.numbers.form];
  const spec = {
    nodes: model.nodes.map((n) => ({ id: n.id, source: n.source })),
    groups: model.groups.map((g) => ({
      id: g.id,
      members: g.members,
      source: g.source,
      ...(g.parent ? { parent: g.parent } : {}),
    })),
    edges: model.edges.map((e) => ({ id: String(e.index), from: e.from, to: e.to, source: e.source })),
    channels: true,
  };
  const marks = [
    ...numbers.map((b) => ({ route: b.route, rect: { x: b.x - size.w / 2, y: b.y - size.h / 2, ...size } })),
    ...pins.map((p) => ({ route: p.route, rect: { x: p.x - MARK.w / 2, y: p.y - MARK.h / 2, ...MARK }, name: 'mark' })),
  ];
  return {
    grid,
    routes,
    labels,
    numbers,
    pins,
    corners: star.signs.corners.map(sign),
    placed: placedOf(spec, grid, routes, labels, marks),
  };
}

/**
 * The picture of `layout=star`: the hub in the middle, its neighbours round it on the most compact ring where nodes,
 * straight lines and their texts find room, frames round neighbours that stand together, laid out as the grid would
 * hand it over, so heads, notes, decision bar and legend follow as in every other picture.
 */
export function starCells(
  model: ArchitectureModel,
  look: Look,
  texts: Texts,
  heads: ReadonlyMap<string, Head>,
  firstRowY: number,
): CellLayout | undefined {
  const hub = hubOf(model);
  if (!hub) return undefined;
  const shapes = new Map(model.nodes.map((n) => [n.id, shapeOf(n, look, texts)]));
  const units = ringOrder(unitsOf(model, hub), model, hub.id).map((unit) => ({
    unit,
    shapes: unit.ids.flatMap((id) => {
      const s = shapes.get(id);
      return s ? [s] : [];
    }),
  }));
  const star = bestStar(model, shapes.get(hub.id) as NonNullable<ReturnType<typeof shapes.get>>, units, look, heads);
  return star ? asCells(model, star, look, firstRowY - RISE) : undefined;
}
