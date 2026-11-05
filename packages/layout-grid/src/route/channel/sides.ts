import { cx, cy, OPPOSITE } from '../../geometry.js';
import type { Board } from '../boxes.js';
import type { Lane } from '../shape.js';
import { byOther, type End } from './ends.js';
import { freeOf, intersect, type Range, sideOf } from './free.js';
import { bentPorts } from './train.js';

/** The ends of a channel grid by side (`<box>|<side>`), and the places found for them so far. */
export interface Sides {
  readonly board: Board;
  readonly sides: ReadonlyMap<string, readonly End[]>;
  readonly along: Map<End, number>;
  readonly spread: number;
  readonly gap: number;
}

const keyOf = (e: End): string => `${e.box.id}|${e.side}`;

/**
 * How a list of ends is placed: one `side`, whose single straight edge may move when its bent ends do not fit beside
 * it, the other end's side then placed `again` without moving it; or two facing sides as one `joint` train, which
 * only takes a train that keeps every end on the side of the straight edge its other box lies on.
 */
type Mode = 'side' | 'again' | 'joint';

/**
 * Places the bent ends of `list` as one train in `free`, clear of the straight ends placed already, and writes their
 * places into `along`. Whether the ends were placed; a `joint` train that would part or spread changes nothing.
 */
export function placeEnds(s: Sides, list: readonly End[], free: readonly Range[], mode: Mode = 'side'): boolean {
  const { along, spread } = s;
  const fixed = list.filter((e) => e.plan.shape === 'straight' && along.has(e));
  const bent = list.filter((e) => e.plan.shape !== 'straight').sort(byOther);
  const first = list[0];
  if (bent.length === 0 || !first) return true;
  const usable = free.length > 0 ? free : [sideOf(first.box, first.side)];
  const straights = [...new Map(fixed.map((e) => [e.plan, e])).values()];
  const pairs = new Map<string, number[]>();
  for (const e of straights) pairs.set(e.pair, [...(pairs.get(e.pair) ?? []), along.get(e) as number]);
  const twins = [...pairs.values()].filter((v) => v.length > 1).map((v): Range => [Math.min(...v), Math.max(...v)]);
  const taken = straights.map((e) => along.get(e) as number);
  const single = straights.length === 1 ? straights[0] : undefined;
  const far = single && [...along.keys()].find((e) => e.plan === single.plan && e !== single);
  const room =
    mode === 'joint' && fixed.length === 2
      ? usable
      : mode === 'side' && far
        ? intersect(usable, freeOf(s.board, far.box, far.side, s.gap))
        : undefined;
  const train = bentPorts(bent, taken, twins, usable, spread, room);
  if (mode === 'joint' && train.how !== 'train' && train.how !== 'shifted') return false;
  for (const [i, e] of bent.entries()) along.set(e, train.spots[i] as number);
  if (train.straight === undefined) return true;
  for (const e of along.keys()) if (e.plan === single?.plan) along.set(e, train.straight);
  const other = far && s.sides.get(keyOf(far));
  if (mode === 'side' && far && other) placeEnds(s, other, freeOf(s.board, far.box, far.side, s.gap), 'again');
  return true;
}

/** The gap the piece of a Z at end `e` runs into: its lane, or for the second end of a detour the other gap. */
const laneOf = (e: End): Lane | undefined =>
  e.plan.shape !== 'Z' ? undefined : e.at === 'to' && e.plan.via ? e.plan.via : e.plan.lane;

const before = (e: End, l: Lane): boolean => (l.axis === 'col' ? cx(e.box.rect) : cy(e.box.rect)) < l.at;

/**
 * Two Zs through one gap whose ends on the two sides facing each other across it stand at one height would run on one
 * another there, or read as one line through the gap. The ends of such two sides are placed again together, as one
 * train in what both sides hold free (`placeEnds`), so no two of them share a place.
 */
export function apartFacing(s: Sides): void {
  const { along, spread } = s;
  const stubs = [...along.keys()].filter((e) => laneOf(e) !== undefined);
  const done = new Set<string>();
  for (const e of stubs)
    for (const f of stubs) {
      const [l, m] = [laneOf(e), laneOf(f)];
      if (!l || !m || e.plan === f.plan || l.axis !== m.axis || l.at !== m.at) continue;
      if (e.side !== OPPOSITE[f.side] || !before(e, l) || before(f, l)) continue;
      if (Math.abs((along.get(e) ?? 0) - (along.get(f) ?? 0)) >= spread - 0.5) continue;
      const pair = `${keyOf(e)}#${keyOf(f)}`;
      if (done.has(pair)) continue;
      done.add(pair);
      const free = intersect(freeOf(s.board, e.box, e.side, s.gap), freeOf(s.board, f.box, f.side, s.gap));
      const list = [...(s.sides.get(keyOf(e)) ?? []), ...(s.sides.get(keyOf(f)) ?? [])];
      if (free.length > 0) placeEnds(s, list, free, 'joint');
    }
}
