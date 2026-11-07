import { DEFAULT_THRESHOLDS } from '@diagrist/core';
import type { Route } from '../layout.js';
import type { GridMetrics } from '../spec.js';
import { wrapWidth } from './blocks.js';
import type { Clear } from './clear.js';
import type { OnLine } from './on-line.js';
import type { EdgeLabel, EdgeText } from './types.js';
import { rectsOf, tiers } from './ways.js';

/** A text keeps one pixel more from foreign lines than the line check asks, against rounding. */
const LINE_GAP = DEFAULT_THRESHOLDS.labelClear + 1;

/** How the texts of a channel grid stand: on their line with a pad, or beside it; names on horizontal pieces first. */
export interface SearchOptions {
  readonly preferFlat: boolean;
  readonly onLine?: OnLine;
  /** Texts on their line may also stand beside its vertical pieces, as beside a twin too close for a text across. */
  readonly beside?: boolean;
}

/** What a block of texts on route `i` meets, by `clearOf`: 0 for a clear spot; counting stops at `limit`. */
export function blockCost(
  block: readonly EdgeLabel[],
  i: number,
  clear: Clear,
  o: SearchOptions,
  limit: number = Infinity,
): number {
  let n = 0;
  for (const r of rectsOf(block, o)) if (n < limit) n += clear.cost(r, i, LINE_GAP, o.onLine !== undefined, limit - n);
  return n;
}

/** The ways of route `i`'s texts that meet nothing, in the order `searchBlock` tries them: those of the first tier, else the first of a later one. */
export function* clearWays(
  route: Route,
  i: number,
  text: EdgeText,
  clear: Clear,
  m: GridMetrics,
  o: SearchOptions,
): Generator<EdgeLabel[]> {
  const [tight, ...later] = tiers(route, i, text, m, o);
  let found = false;
  for (const block of tight ?? [])
    if (blockCost(block, i, clear, o, 1) === 0) {
      found = true;
      yield block;
    }
  if (found) return;
  for (const tier of later)
    for (const block of tier)
      if (blockCost(block, i, clear, o, 1) === 0) {
        yield block;
        return;
      }
}

/** Whether a line of `block` runs wider than `wrapWidth` though it could wrap. */
export const tooWide = (block: readonly EdgeLabel[], m: GridMetrics): boolean =>
  block.some((l) => l.box.w > wrapWidth(m) + 0.5 && l.text.includes(' '));

/** The block of a route's texts as placed and what it meets; 0 is a clear spot. */
export interface Found {
  readonly block: EdgeLabel[];
  readonly cost: number;
}

/**
 * The texts of route `i` as one block: kept at `first` when that spot is clear, no line of it runs wider than
 * `wrapWidth` and it keeps `crowding`'s distance from the texts of other routes; else at the clear spot beside or on
 * one of its pieces, longest first and nearest the middle, wrapped where that helps, that comes least near those
 * texts, the first such one on a tie; of a later tier, the first clear spot; without a clear spot, where it meets the
 * least.
 */
export function searchBlock(
  route: Route,
  i: number,
  text: EdgeText,
  first: EdgeLabel[],
  clear: Clear,
  m: GridMetrics,
  o: SearchOptions,
): Found {
  const crowding = (block: readonly EdgeLabel[]) => rectsOf(block, o).reduce((n, r) => n + clear.crowding(r, i), 0);
  let best: Found = { block: first, cost: tooWide(first, m) ? Infinity : blockCost(first, i, clear, o) };
  let near = best.cost === 0 ? crowding(first) : Infinity;
  if (near === 0) return best;
  const [tight, ...later] = tiers(route, i, text, m, o);
  for (const block of tight ?? []) {
    const c = blockCost(block, i, clear, o, Math.max(1, best.cost));
    const k = c === 0 ? crowding(block) : Infinity;
    if (c < best.cost || (c === 0 && k < near)) {
      best = { block, cost: c };
      near = k;
    }
    if (near === 0) return best;
  }
  if (best.cost === 0) return best;
  for (const tier of later)
    for (const block of tier) {
      const c = blockCost(block, i, clear, o, Math.max(1, best.cost));
      if (c < best.cost) best = { block, cost: c };
      if (c === 0) return best;
    }
  return best;
}
