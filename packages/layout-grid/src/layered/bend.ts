import type { Group } from './links.js';
import type { Ports } from './ports.js';

/** A line beside its layer that runs around the boxes between its ends: its layer and where its ends stand. */
export interface Around {
  readonly id: string;
  readonly layer: number;
  readonly from: number;
  readonly to: number;
}

/**
 * The lines beside their layer that bend above it rather than below (layout plan R3, the side to bend to), chosen
 * one by one on the ports of the picture: below the layer, a line runs down through the whole gap and along a track
 * under all others, so it crosses every piece whose horizontal passes one of its ends and every piece that enters a
 * box between its ends; above, it runs along a track just over the layer, so it crosses only the pieces that enter a
 * box between its ends. A line bends above where that crosses fewer; a tie stays below.
 */
export function bendSides(around: readonly Around[], groups: readonly Group[], ports: Ports): Set<string> {
  const up = new Set<string>();
  for (const e of around) {
    const [lo, hi] = [Math.min(e.from, e.to), Math.max(e.from, e.to)];
    const crossed = (gap: number, through: boolean) =>
      groups
        .filter((g) => g.links[0]?.gap === gap)
        .reduce((n, g) => {
          const ends = [...new Set(g.links.map((l) => ports.top.get(l) ?? 0))];
          const xs = [...ends, ...g.links.map((l) => ports.bottom.get(l) ?? 0)];
          const [a, b] = [Math.min(...xs), Math.max(...xs)];
          const passed = through ? [e.from, e.to].filter((v) => a < v - 0.5 && b > v + 0.5).length : 0;
          return n + ends.filter((v) => v > lo + 0.5 && v < hi - 0.5).length + passed;
        }, 0);
    if (crossed(e.layer - 1, false) < crossed(e.layer, true)) up.add(e.id);
  }
  return up;
}
