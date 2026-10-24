import { neighbours, type Parts, type Side } from './parts.js';
import type { Plan } from './plan.js';
import { ACTOR, actorWish, compact, mean, type Positions, stackBands, wishes } from './rows.js';
import { permuteImprove } from './search.js';
import { arrange } from './spread.js';
import { badness, type Frame, swapImprove } from './swap.js';

/** Passes of the ordering; after them nothing changes at usual sizes. */
const PASSES = 6;
const CASE = { gap: 1, step: 1 } as const;
/** Wished distance of a special use case below its general one: just under a row, so it follows directly. */
const SPECIAL = 0.9;

/** An arrangement: rows per element, the plan, how bad it is, and how to place the actors again. */
export interface Solved {
  readonly pos: Positions;
  readonly plan: Plan;
  readonly side: ReadonlyMap<string, Side>;
  readonly bad: number;
  readonly placeActors: () => void;
}

const restore = (pos: Positions, from: ReadonlyMap<string, number>) => {
  for (const [id, v] of from) pos.set(id, v);
};

/**
 * One arrangement by plan: barycentre passes and swaps; when lines still cross, the search tries the orders of every
 * small column. Subjects below each other stand as bands.
 */
export function solve(p: Parts, bandOf: (id: string) => number, plan: Plan, subjects: number): Solved {
  const { depth, columns } = plan;
  const adj = neighbours(p);
  const column = (c: number) => p.cases.filter((u) => depth.get(u.id) === c).map((u) => u.id);
  const general = (id: string) =>
    p.relations.find((r) => r.kind === 'generalization' && r.from === id && depth.get(r.to) === depth.get(id))?.to;
  const pos: Positions = new Map();
  const caseWish = (id: string) => {
    const g = general(id);
    const above = g === undefined ? undefined : pos.get(g);
    return above === undefined ? mean(adj.get(id) ?? [], pos) : above + SPECIAL;
  };
  for (let c = 0; c < columns; c++) for (const [i, id] of column(c).entries()) pos.set(id, i);
  const stack = () => {
    if (plan.grid) stackBands(p, plan.grid.row, pos);
    else if (!plan.across) stackBands(p, bandOf, pos);
  };
  const placeActors = () => {
    for (const lane of new Set(plan.lane.values())) {
      const ids = p.actors.filter((a) => plan.lane.get(a.id) === lane).map((a) => a.id);
      const wish = wishes(ids, (id) => {
        const a = p.actors.find((x) => x.id === id);
        return a && actorWish(a, p, pos);
      });
      for (const [id, v] of arrange(ids, wish, pos, ACTOR)) pos.set(id, v);
    }
  };
  stack();
  placeActors();
  const chain = (id: string, guard = p.cases.length): { root: string; level: number } => {
    const g = general(id);
    if (g === undefined || guard === 0) return { root: id, level: 0 };
    const up = chain(g, guard - 1);
    return { root: up.root, level: up.level + 1 };
  };
  const sweep = (locked: (c: number) => boolean) => {
    for (let c = 0; c < columns; c++) {
      const ids = column(c);
      const wish = wishes(ids, caseWish);
      const rank = (id: string) => {
        if (locked(c)) return [pos.get(id) ?? 0];
        const { root, level } = chain(id);
        return [bandOf(id), wish.get(root) ?? pos.get(root) ?? 0, pos.get(root) ?? 0, level];
      };
      for (const [id, v] of arrange(ids, wish, pos, CASE, rank)) pos.set(id, v);
    }
    stack();
    placeActors();
  };
  for (let pass = 0; pass < PASSES; pass++) sweep(() => false);
  const frame: Frame = { p, depth, actorX: plan.actorX, columns };
  const settle = (c: number) => {
    for (let pass = 0; pass < 2; pass++) sweep((k) => k === c);
  };
  const key = (id: string) => `${bandOf(id)}|${chain(id).root}`;
  swapImprove(frame, pos, column, key, settle);
  if (badness(frame, pos) > 0) {
    permuteImprove(frame, pos, column, key, settle);
    swapImprove(frame, pos, column, key, settle);
  }
  const swapped = new Map(pos);
  for (let pass = 0; pass < 2; pass++) sweep(() => true);
  if (badness(frame, pos) > badness(frame, swapped)) restore(pos, swapped);
  if (subjects > 1) {
    const loose = new Map(pos);
    compact(p, bandOf, pos);
    stack();
    placeActors();
    if (badness(frame, pos) > badness(frame, loose)) restore(pos, loose);
  }
  return { pos, plan, side: plan.side, bad: badness(frame, pos), placeActors };
}
