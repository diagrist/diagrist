import type { Ranked } from './rank.js';
import type { LayeredSpec } from './spec.js';

/** What single edges ask of the gaps and layers: straight runs at their ends, room beside, or not to be drawn. */
export interface Runs {
  hidden(edge: string): boolean;
  /** The longest run an edge asks for at the top of gap `l`, out of the box above it, and at its bottom. */
  top(l: number): number;
  bottom(l: number): number;
  /** The room an edge drawn beside asks for between neighbours `a` and `b`. */
  room(a: string, b: string): number;
}

const key = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

/**
 * The runs of every drawn edge at the gap below its upper end and above its lower end, `from` or `to` depending on
 * which way the edge is drawn, and the room of every edge drawn beside.
 */
export function runsOf(spec: LayeredSpec, ranked: Ranked): Runs {
  const hidden = new Set(spec.edges.flatMap((e) => (e.hidden === true ? [e.id] : [])));
  const top = new Map<number, number>();
  const bottom = new Map<number, number>();
  const room = new Map<string, number>();
  const raise = (at: Map<number, number>, l: number, v: number | undefined) => {
    if (v !== undefined) at.set(l, Math.max(at.get(l) ?? 0, v));
  };
  for (const e of spec.edges) {
    if (hidden.has(e.id)) continue;
    if (e.room !== undefined) room.set(key(e.from, e.to), Math.max(room.get(key(e.from, e.to)) ?? 0, e.room));
    const chain = ranked.chains.get(e.id);
    if (e.run === undefined || chain === undefined) continue;
    const down = ranked.down.get(e.id) !== false;
    raise(top, ranked.layerOf.get(chain[0] as string) ?? 0, down ? e.run.from : e.run.to);
    raise(bottom, ranked.layerOf.get(chain.at(-2) as string) ?? 0, down ? e.run.to : e.run.from);
  }
  return {
    hidden: (edge) => hidden.has(edge),
    top: (l) => top.get(l) ?? 0,
    bottom: (l) => bottom.get(l) ?? 0,
    room: (a, b) => room.get(key(a, b)) ?? 0,
  };
}
