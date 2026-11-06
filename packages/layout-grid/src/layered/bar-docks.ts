import type { Link } from './links.js';
import type { Ports } from './ports.js';

/** What the ends at the bars are found on: the bars, the pieces, how many ends each side of a box holds. */
export interface BarDocking {
  readonly bars: ReadonlySet<string>;
  readonly links: readonly Link[];
  readonly real: (n: string) => boolean;
  /** Ends on `box|top` or `box|bottom`. */
  readonly count: ReadonlyMap<string, number>;
  readonly centre: (n: string) => number;
  /** Whether the row of a box between two places holds nothing else, no box and no long line. */
  readonly free: (n: string, a: number, b: number) => boolean;
}

/**
 * The ends on bars: a branch, on the side of the bar with more pieces, stands straight above or below its other end,
 * which stands in the middle of its box where it is the only end on its side; the trunk, on the other side, stands
 * straight at its other end too where the bar may grow so far, and otherwise as near it as the branches reach, so the
 * bar never grows over a box or a line beside it. Moves the ports in place.
 */
export function dockBars(d: BarDocking, ports: Ports): void {
  for (const bar of d.bars) {
    const below = d.links.filter((l) => l.upper === bar && !d.bars.has(l.lower));
    const above = d.links.filter((l) => l.lower === bar && !d.bars.has(l.upper));
    const straight = (l: Link, down: boolean) => {
      const [end, side, at, there] = down
        ? [l.lower, 'top', ports.bottom, ports.top]
        : [l.upper, 'bottom', ports.top, ports.bottom];
      if (d.real(end) && d.count.get(`${end}|${side}`) === 1) there.set(l, d.centre(end));
      at.set(l, d.real(end) ? (there.get(l) ?? d.centre(end)) : d.centre(end));
    };
    for (const l of below) straight(l, true);
    for (const l of above) straight(l, false);
    const [branches, trunk, at] =
      below.length >= above.length ? [below, above, ports.top] : [above, below, ports.bottom];
    if (branches.length < 2) continue;
    const xs = branches.map((l) => (at === ports.top ? ports.bottom : ports.top).get(l) ?? 0);
    const [lo, hi] = [Math.min(...xs), Math.max(...xs)];
    for (const l of trunk) {
      const want = at.get(l) ?? lo;
      const near = Math.min(hi, Math.max(lo, want));
      if (!d.free(bar, near, want)) at.set(l, near);
    }
  }
}
