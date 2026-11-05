import { type Range, within } from './free.js';

/** How finely a train of ends slides along its side. */
const STEP = 2;

/** A bent end in a train: where its other box lies along the side, and the two boxes its edge joins. */
export interface Car {
  readonly other: number;
  readonly pair: string;
}

/** The steps between neighbours of a train: `spread`, twice that between two ends of edges between the same boxes. */
const stepsOf = (ends: readonly Car[], spread: number): number[] =>
  ends.slice(1).map((e, i) => (e.pair === (ends[i] as Car).pair ? 2 * spread : spread));

/**
 * Places of the ends of a train, by its order, and how they were found: as one train, beside its one straight end
 * moved to `straight`, parted around that end, or spread evenly as the last resort.
 */
export interface Train {
  readonly spots: readonly number[];
  readonly how: 'train' | 'shifted' | 'parted' | 'even';
  readonly straight?: number;
}

/**
 * A train beside a single straight end `f` that may move within `room`, when all its other boxes lie on one side of
 * that end: the whole train on that side, the straight end moved just so far that the train fits between it and the
 * end of `free`. `undefined` when the other boxes lie on both sides or even that does not fit.
 */
function shiftedTrain(
  ends: readonly Car[],
  f: number,
  free: readonly Range[],
  room: readonly Range[],
  spread: number,
): Train | undefined {
  const steps = stepsOf(ends, spread);
  const total = steps.reduce((a, b) => a + b, 0);
  const range = free.find(([a, b]) => f >= a && f <= b);
  if (!range) return undefined;
  const ahead = ends.filter((e) => e.other < f).length;
  if (ahead !== 0 && ahead !== ends.length) return undefined;
  const before = ahead > 0;
  const straight = before ? Math.max(f, range[0] + total + spread) : Math.min(f, range[1] - total - spread);
  const first = before ? straight - spread - total : straight + spread;
  if (!within(straight, room) || !within(first, [range]) || !within(first + total, [range])) return undefined;
  let at = first;
  const spots = [at, ...steps.map((d) => (at += d))];
  return { spots, how: 'shifted', straight };
}

/**
 * A train parted around the one straight end of its side, the ends whose other box lies before it before it and the
 * rest after, `spread` from it and the steps of the train between each other; then the other partings, nearest
 * first. `undefined` when the side has not one straight end or no parting fits its free stretches.
 */
function around(
  ends: readonly Car[],
  steps: readonly number[],
  fixed: readonly number[],
  free: readonly Range[],
  spread: number,
): number[] | undefined {
  const [f] = fixed;
  if (f === undefined || fixed.length !== 1) return undefined;
  const natural = ends.filter((e) => e.other < f).length;
  const partings = ends
    .map((_, k) => k)
    .concat(ends.length)
    .sort((a, b) => Math.abs(a - natural) - Math.abs(b - natural) || a - b);
  for (const k of partings) {
    const spots = ends.map(() => 0);
    for (let i = k - 1; i >= 0; i--) spots[i] = i === k - 1 ? f - spread : (spots[i + 1] ?? f) - (steps[i] ?? spread);
    for (let i = k; i < ends.length; i++)
      spots[i] = i === k ? f + spread : (spots[i - 1] ?? f) + (steps[i - 1] ?? spread);
    if (spots.every((v) => within(v, free))) return spots;
  }
  return undefined;
}

/**
 * Bent ends of one side, in the order of their other ends, as a train: `spread` apart, twice that between two ends
 * of edges between the same boxes, so their texts find room between them. The train stands inside the free stretches
 * of the side, `spread` clear of its straight ends and never between two straight `twins`, its middle as near the
 * middle of the side as that allows, on a tie towards where the other ends lie. Where no train fits beside a single
 * straight end, it moves that end within `room` where one is given (`shiftedTrain`), else parts around it (`around`); where that
 * fails too, the ends spread evenly over the longest free stretch.
 */
export function bentPorts(
  ends: readonly Car[],
  fixed: readonly number[],
  twins: readonly Range[],
  free: readonly Range[],
  spread: number,
  room?: readonly Range[],
): Train {
  const steps = stepsOf(ends, spread);
  const offsets = [0];
  for (const d of steps) offsets.push((offsets.at(-1) ?? 0) + d);
  const total = offsets.at(-1) ?? 0;
  const [lo, hi] = [Math.min(...free.map((r) => r[0])), Math.max(...free.map((r) => r[1]))];
  const centre = (lo + hi) / 2;
  const towards = ends.reduce((sum, e) => sum + e.other, 0) / ends.length;
  const fits = (start: number) =>
    offsets.every(
      (d) =>
        within(start + d, free) &&
        fixed.every((f) => Math.abs(f - start - d) >= spread - 0.5) &&
        !twins.some(([a, b]) => start + d > a && start + d < b),
    );
  const starts: number[] = [];
  for (let s = lo; s + total <= hi + 0.5; s += STEP) if (fits(s)) starts.push(s);
  const cost = (s: number) => Math.abs(s + total / 2 - centre) + Math.abs(s + total / 2 - towards) / 1000;
  const best = [...starts, ...(fits(centre - total / 2) ? [centre - total / 2] : [])].sort(
    (a, b) => cost(a) - cost(b),
  )[0];
  if (best !== undefined) return { spots: offsets.map((d) => best + d), how: 'train' };
  const shifted = room && fixed.length === 1 ? shiftedTrain(ends, fixed[0] as number, free, room, spread) : undefined;
  if (shifted !== undefined) return shifted;
  const split = around(ends, steps, fixed, free, spread);
  if (split !== undefined) return { spots: split, how: 'parted' };
  const longest = [...free].sort((x, y) => y[1] - y[0] - (x[1] - x[0]))[0] ?? [lo, hi];
  return {
    spots: ends.map((_, i) => longest[0] + ((longest[1] - longest[0]) * (i + 1)) / (ends.length + 1)),
    how: 'even',
  };
}
