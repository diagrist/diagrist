import { barSpines, cornerPulls, withinLanes } from './bar-links.js';
import { type CoordsInput, coords, type Xs } from './coords.js';
import type { LayeredSpec } from './spec.js';

/**
 * The centre of every node (`coords`) with the pulls of bars, corners and lanes: what hangs on a bar stands straight
 * on across it (`barSpines`), the branches out of corners pull lightly (`cornerPulls`), and in a picture with lanes
 * (ADR 0039, 11) each lane is placed on its own, by the links within it, as if it were a picture of its own, its
 * leftmost box at `left`; the lanes then stand side by side (`Lanes.clear`). A picture without lanes is placed as a
 * whole.
 */
export function laneCoords(
  spec: LayeredSpec,
  base: CoordsInput,
  left: number,
  lane: (id: string) => number | undefined,
): Xs {
  const across = barSpines(spec, base.ranked, base.links, lane);
  const links = cornerPulls(spec, base.ranked, withinLanes(base.links, lane));
  const sided = new Set(spec.nodes.flatMap((n) => (n.sides ? [n.id] : [])));
  const fixed = (n: string) => sided.has(n);
  const input = { ...base, links, spines: [...(base.spines ?? []), ...across], fixed };
  const all = input.layers.flat();
  const lanes = [...new Set(all.map(lane))];
  if (lanes.length < 2 || lanes.includes(undefined)) return coords(input, left);
  const out: Xs = new Map();
  for (const i of lanes) {
    const mine = (n: string) => lane(n) === i;
    const chains = new Map([...input.ranked.chains].filter(([, chain]) => chain.slice(1, -1).every(mine)));
    const x = coords(
      {
        ...input,
        layers: input.layers.map((l) => l.filter(mine)),
        ranked: { ...input.ranked, chains },
        spines: (input.spines ?? []).filter(([a, b]) => mine(a) && mine(b)),
      },
      left,
    );
    for (const n of all) if (mine(n)) out.set(n, x.get(n) ?? left);
  }
  return out;
}
