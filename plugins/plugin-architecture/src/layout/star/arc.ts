/** How many pieces the arc length of an ellipse is measured in. */
const SAMPLES = 360;
/** How often the angles are set anew from the room the units take at their last angles. */
const ROUNDS = 3;

const TAU = 2 * Math.PI;

/** The length of the ellipse with half axes `a` and `b` from angle 0 up to each of its samples. */
function arcTable(a: number, b: number): number[] {
  const out = [0];
  for (let k = 1; k <= SAMPLES; k++) {
    const t0 = (TAU * (k - 1)) / SAMPLES;
    const t1 = (TAU * k) / SAMPLES;
    const d = Math.hypot(a * (Math.cos(t1) - Math.cos(t0)), b * (Math.sin(t1) - Math.sin(t0)));
    out.push((out[k - 1] as number) + d);
  }
  return out;
}

const wrap = (x: number, period: number): number => ((x % period) + period) % period;

/** The arc length up to an angle. */
function lengthAt(table: readonly number[], angle: number): number {
  const u = (wrap(angle, TAU) / TAU) * SAMPLES;
  const k = Math.min(SAMPLES - 1, Math.floor(u));
  const lo = table[k] as number;
  return lo + ((table[k + 1] as number) - lo) * (u - k);
}

/** The angle at an arc length. */
function angleAt(table: readonly number[], length: number): number {
  const s = wrap(length, table[SAMPLES] as number);
  let lo = 0;
  let hi = SAMPLES;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if ((table[mid] as number) <= s) lo = mid;
    else hi = mid;
  }
  const a = table[lo] as number;
  const span = (table[lo + 1] as number) - a || 1;
  return (TAU * (lo + (s - a) / span)) / SAMPLES;
}

/** How wide a rectangle of `w` by `h` is along the ellipse at `angle`. */
export function alongWidth(w: number, h: number, a: number, b: number, angle: number): number {
  const tx = -a * Math.sin(angle);
  const ty = b * Math.cos(angle);
  const len = Math.hypot(tx, ty) || 1;
  return (Math.abs(tx) * w + Math.abs(ty) * h) / len;
}

/**
 * The angles of `n` units round an ellipse with half axes `a` and `b`, the first at `theta`, going `turn` round, so
 * that the room left between each two along the ellipse is the same: a wide unit takes more of the ring than a narrow
 * one. `widthAt` says how wide unit `i` is along the ellipse at an angle. Where the units take more than the ring has,
 * the angles stay even.
 */
export function evenGaps(
  n: number,
  theta: number,
  turn: 1 | -1,
  a: number,
  b: number,
  widthAt: (i: number, angle: number) => number,
): number[] {
  let angles = Array.from({ length: n }, (_, i) => theta + (turn * TAU * i) / n);
  if (n < 3) return angles;
  const table = arcTable(a, b);
  const total = table[SAMPLES] as number;
  const start = lengthAt(table, theta);
  for (let round = 0; round < ROUNDS; round++) {
    const widths = angles.map((angle, i) => widthAt(i, angle));
    const free = (total - widths.reduce((x, y) => x + y, 0)) / n;
    if (free <= 0) return angles;
    let at = 0;
    angles = widths.map((w, i) => {
      if (i > 0) at += ((widths[i - 1] as number) + w) / 2 + free;
      return i === 0 ? theta : angleAt(table, start + turn * at);
    });
  }
  return angles;
}
