import type { Rect } from '@diagrist/core';
import { bottom, right } from '../geometry.js';

/** A rectangle a step may not run through, grown by `pad` on every side; touching does not count. */
export interface Blocker {
  readonly rect: Rect;
  readonly pad: number;
}

/** The first index whose value is above `limit`, or at least `limit` with `orEqual`; `values` ascend. */
function firstFrom(values: readonly number[], limit: number, orEqual: boolean): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    const value = values[middle] as number;
    if (value > limit || (orEqual && value === limit)) high = middle;
    else low = middle + 1;
  }
  return low;
}

/**
 * Which steps of one grid line run through a blocker: entry `i` is 1 when the step from `along[i]` to
 * `along[i + 1]` does. A `row` is the horizontal line at y = `at` with x = `along`, a `column` the vertical line at
 * x = `at`. The comparisons are those of `segmentHitsRect`, made once per blocker and line instead of once per step.
 */
export function blockedSteps(
  along: readonly number[],
  at: number,
  blockers: readonly Blocker[],
  line: 'row' | 'column',
): Uint8Array {
  const steps = Math.max(along.length - 1, 0);
  const starts = new Int32Array(steps + 1);
  for (const { rect, pad } of blockers) {
    const across =
      line === 'row' ? at < bottom(rect) + pad && at > rect.y - pad : at < right(rect) + pad && at > rect.x - pad;
    if (!across) continue;
    const low = line === 'row' ? rect.x - pad : rect.y - pad;
    const high = line === 'row' ? right(rect) + pad : bottom(rect) + pad;
    const first = Math.max(firstFrom(along, low, false) - 1, 0);
    const last = Math.min(firstFrom(along, high, true), steps);
    if (first >= last) continue;
    starts[first] = (starts[first] as number) + 1;
    starts[last] = (starts[last] as number) - 1;
  }
  const blocked = new Uint8Array(steps);
  let open = 0;
  for (let i = 0; i < steps; i++) {
    open += starts[i] as number;
    blocked[i] = open > 0 ? 1 : 0;
  }
  return blocked;
}
