import type { Point } from '@diagrist/core';
import { segmentMeetsEllipse, segmentsIntersect } from '@diagrist/layout-grid';
import type { Parts } from './parts.js';

/** A line grazing a foreign use case weighs more than a crossing. */
const THROUGH = 5;
/** Half axes of a use case in the abstract grid, where a column is 1 wide and a row 1 high. */
const RX = 0.38;
const RY = 0.3;
const ROUNDS = 3;
/** Shorter lines count only from a whole row of gain, so equally good pictures stay as they are. */
const MIN_GAIN = 1;

/** What the counts need: the parts, the column of every use case and the abstract x of every actor. */
export interface Frame {
  readonly p: Parts;
  readonly depth: ReadonlyMap<string, number>;
  readonly actorX: ReadonlyMap<string, number>;
  readonly columns: number;
}

function at(f: Frame, pos: ReadonlyMap<string, number>, id: string): Point | undefined {
  const y = pos.get(id);
  const x = f.depth.get(id) ?? f.actorX.get(id);
  return y === undefined || x === undefined ? undefined : [x, y];
}

/** Crossings and grazed use cases of the straight lines, counted in the abstract grid. */
export function badness(f: Frame, pos: ReadonlyMap<string, number>): number {
  const lines = f.p.relations.flatMap((r) => {
    const a = at(f, pos, r.from);
    const b = at(f, pos, r.to);
    return a && b && r.from !== r.to ? [{ a, b, ends: [r.from, r.to] }] : [];
  });
  let bad = 0;
  lines.forEach((l, i) => {
    for (const m of lines.slice(i + 1)) if (segmentsIntersect(l.a, l.b, m.a, m.b)) bad++;
  });
  for (const l of lines)
    for (const u of f.p.cases) {
      const c = at(f, pos, u.id);
      if (c && !l.ends.includes(u.id) && segmentMeetsEllipse(l.a, l.b, c, RX, RY)) bad += THROUGH;
    }
  return bad;
}

/** Sum of the height differences of all lines in the abstract grid: smaller is more compact. */
function spanOf(f: Frame, pos: ReadonlyMap<string, number>): number {
  return f.p.relations.reduce((s, r) => {
    const a = pos.get(r.from);
    const b = pos.get(r.to);
    return a === undefined || b === undefined ? s : s + Math.abs(a - b);
  }, 0);
}

/** Better: fewer crossings, on a tie clearly shorter lines. */
function better(f: Frame, now: ReadonlyMap<string, number>, than: ReadonlyMap<string, number>): boolean {
  const a = badness(f, now);
  const b = badness(f, than);
  return a < b || (a === b && spanOf(f, now) < spanOf(f, than) - MIN_GAIN);
}

/** Blocks of a column: neighbouring use cases of one chain (general and special) stay together. */
export function blocks(
  ids: readonly string[],
  pos: ReadonlyMap<string, number>,
  key: (id: string) => string,
): string[][] {
  const sorted = [...ids].sort((a, b) => (pos.get(a) ?? 0) - (pos.get(b) ?? 0));
  const out: string[][] = [];
  for (const id of sorted) {
    const last = out.at(-1);
    const head = last?.[0];
    if (last && head !== undefined && key(head) === key(id)) last.push(id);
    else out.push([id]);
  }
  return out;
}

/** Blocks in a new order on the rows the column had. */
export function reslot(order: readonly string[][], pos: Map<string, number>): void {
  const ids = order.flat();
  const slots = ids.map((id) => pos.get(id) ?? 0).sort((x, y) => x - y);
  ids.forEach((id, k) => {
    pos.set(id, slots[k] ?? 0);
  });
}

/** The subject part of the key of a block. */
export const bandOfBlock = (b: readonly string[], key: (id: string) => string): string =>
  key(b[0] ?? '').split('|')[0] ?? '';

/**
 * Improvement after the barycentre: a block of a column moves to every other place within the same subject when
 * fewer lines cross or graze use cases afterwards, or lines get clearly shorter at as many crossings. `settle`
 * orders the other columns and the actors again.
 */
export function swapImprove(
  f: Frame,
  pos: Map<string, number>,
  column: (c: number) => string[],
  key: (id: string) => string,
  settle: (column: number) => void,
): void {
  for (let round = 0; round < ROUNDS; round++) {
    let improved = false;
    for (let c = 0; c < f.columns; c++)
      for (let i = 0; i < blocks(column(c), pos, key).length; i++)
        for (let j = 0; j < blocks(column(c), pos, key).length; j++) {
          const list = blocks(column(c), pos, key);
          const moving = list[i];
          const target = list[j];
          if (i === j || !moving || !target || bandOfBlock(moving, key) !== bandOfBlock(target, key)) continue;
          const order = list.filter((_, k) => k !== i);
          order.splice(j, 0, moving);
          const saved = new Map(pos);
          reslot(order, pos);
          settle(c);
          if (better(f, pos, saved)) improved = true;
          else for (const [id, v] of saved) pos.set(id, v);
        }
    if (!improved) break;
  }
}
