import type { Point, Rect } from '@diagrist/core';
import type { GridLayout, Pads, PlacedGroup, Route } from '@diagrist/layout-grid';
import type { ClassRelation } from '../diagram.js';
import type { ClassModel } from '../model.js';
import { packagesAround } from '../model.js';
import type { Cell } from './cells.js';
import { CLASS, tabWidth } from './metrics.js';

/** First and last layer, first and last half column a package covers with its classifiers. */
interface Extent {
  readonly rows: readonly [number, number];
  readonly cols: readonly [number, number];
}

/** The extent of each package that holds classifiers, also through nested packages. */
export function packageExtents(m: ClassModel, cells: ReadonlyMap<string, Cell>): Map<string, Extent> {
  const out = new Map<string, Extent>();
  for (const [id, c] of cells)
    for (const p of packagesAround(m, id)) {
      const e = out.get(p);
      out.set(p, {
        rows: [Math.min(e?.rows[0] ?? c.row, c.row), Math.max(e?.rows[1] ?? c.row, c.row)],
        cols: [Math.min(e?.cols[0] ?? c.cross, c.cross), Math.max(e?.cols[1] ?? c.cross + 1, c.cross + 1)],
      });
    }
  return out;
}

/**
 * Gap below layer `row`: the feet of packages ending there and the tabs of packages starting below, nested ones added
 * up per column, and room for a dependency between the frames. A package frame is wider than its classes, so every
 * frame counts. 0 without packages, which leaves the gap to the grid.
 */
export function packageRowGap(extents: ReadonlyMap<string, Extent>, row: number): number {
  const close = new Map<number, number>();
  const open = new Map<number, number>();
  for (const e of extents.values())
    for (let c = e.cols[0]; c <= e.cols[1]; c++) {
      if (e.rows[1] === row) close.set(c, (close.get(c) ?? 0) + 24);
      if (e.rows[0] === row + 1) open.set(c, (open.get(c) ?? 0) + CLASS.tabH + CLASS.packagePad);
    }
  const most = (m: ReadonlyMap<number, number>) => Math.max(0, ...m.values());
  return most(close) || most(open) ? most(close) + most(open) + 56 + 16 : 0;
}

/**
 * Packages of one depth line up with the grid: those starting in the same layer share their top edge, those ending in
 * the same layer their bottom edge, however high the classes in them are.
 */
export function alignPackages(m: ClassModel, grid: GridLayout, extents: ReadonlyMap<string, Extent>): GridLayout {
  const depth = (id: string) => packagesAround(m, id).length;
  const groups = grid.groups.map((g): PlacedGroup => {
    const e = extents.get(g.id);
    if (!e) return g;
    const peers = (i: 0 | 1) =>
      grid.groups.filter((p) => depth(p.id) === depth(g.id) && extents.get(p.id)?.rows[i] === e.rows[i]);
    const y = Math.min(...peers(0).map((p) => p.rect.y));
    const end = Math.max(...peers(1).map((p) => p.rect.y + p.rect.h));
    return { ...g, rect: { ...g.rect, y, h: end - y } };
  });
  return { ...grid, groups };
}

/** Air between a tab and a line passing it. */
const AIR = 12;

const overlaps = (a: Rect, b: Rect, pad: number) =>
  a.x < b.x + b.w + pad && a.x + a.w > b.x - pad && a.y < b.y + b.h + pad && a.y + a.h > b.y - pad;

const hits = (p: Point, q: Point, r: Rect) =>
  Math.min(p[0], q[0]) < r.x + r.w &&
  Math.max(p[0], q[0]) > r.x &&
  Math.min(p[1], q[1]) < r.y + r.h &&
  Math.max(p[1], q[1]) > r.y;

/**
 * Room for the tab of a package: when a line not ending at the package runs through its tab, the
 * frame grows to the left until the tab stands beside the line, unless it would then meet a foreign frame. Returns
 * the pads to add, empty when nothing grows; the kind places and routes again with them.
 */
export function tabGrowth(
  m: ClassModel,
  grid: GridLayout,
  routes: readonly Route[],
  relations: readonly (ClassRelation | undefined)[],
): Map<string, Pads> {
  const out = new Map<string, Pads>();
  const related = (a: string, b: string) =>
    a === b || packagesAround(m, a).includes(b) || packagesAround(m, b).includes(a);
  for (const g of grid.groups) {
    const label = m.packages.get(g.id)?.label;
    if (label === undefined) continue;
    const tab = { x: g.rect.x, y: g.rect.y, w: Math.min(g.rect.w, tabWidth(label)), h: CLASS.tabH };
    const xs = routes.flatMap((r, i) => {
      const rel = relations[i];
      if (rel && (rel.from === g.id || rel.to === g.id)) return [];
      return r.points.slice(1).flatMap((q, k) => {
        const p = r.points[k] ?? q;
        return hits(p, q, tab) ? [Math.min(p[0], q[0])] : [];
      });
    });
    if (!xs.length) continue;
    const left = Math.ceil(tab.x + tab.w - Math.min(...xs) + AIR);
    const moved = { ...g.rect, x: g.rect.x - left, w: g.rect.w + left };
    if (grid.groups.some((o) => !related(o.id, g.id) && overlaps(moved, o.rect, AIR))) continue;
    if (left >= 1) out.set(g.id, { top: 0, bottom: 0, left, right: 0 });
  }
  return out;
}
