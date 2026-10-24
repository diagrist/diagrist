import type { Parts } from './parts.js';
import type { Plan } from './plan.js';

/** Where the automatic grid puts an element: column, row, and the last row when it stands between two. */
export interface Place {
  readonly col: string;
  readonly row: string;
  readonly toRow?: string;
}

/** The automatic grid: named columns and rows, and a place per actor and use case. */
export interface AutoGrid {
  readonly cols: readonly string[];
  readonly rows: readonly string[];
  readonly places: ReadonlyMap<string, Place>;
}

/**
 * Abstract rows and columns as named lines of the grid. An actor between two rows spans both and stands in their
 * middle; `floor` keeps a row free at the top that only a note will use.
 */
export function toGrid(p: Parts, pos: ReadonlyMap<string, number>, plan: Plan, floor?: number): AutoGrid {
  if (pos.size === 0) return { cols: plan.cols, rows: [], places: new Map() };
  const min = Math.floor(Math.min(...pos.values(), floor ?? Number.POSITIVE_INFINITY));
  const max = Math.ceil(Math.max(...pos.values()));
  const row = (v: number) => `r${v - min + 1}`;
  const places = new Map<string, Place>();
  const colOf = (id: string) => plan.colOf.get(id) ?? plan.cols[0] ?? 'u1';
  for (const u of p.cases) places.set(u.id, { col: colOf(u.id), row: row(pos.get(u.id) ?? min) });
  for (const a of p.actors) {
    const v = pos.get(a.id) ?? min;
    const lo = Math.floor(v);
    places.set(a.id, { col: colOf(a.id), row: row(lo), ...(v > lo ? { toRow: row(lo + 1) } : {}) });
  }
  return { cols: plan.cols, rows: Array.from({ length: max - min + 1 }, (_, i) => `r${i + 1}`), places };
}
