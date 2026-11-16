import { type Band, loose } from './ranks-order.js';
import type { ArchitectureModel } from './types.js';

/** A band of neighbours: above the hub or below it. */
export type Side = 'top' | 'bottom';

/** The columns a node covers, from `col` to `to`. */
export interface Spot {
  readonly col: string;
  readonly to: string;
}

/** The inner columns of a star, where the hub and each neighbour in a band stand, and whether columns are halves. */
export interface Placed {
  readonly cols: readonly string[];
  readonly hub: Spot;
  readonly spots: ReadonlyMap<string, Spot>;
  readonly halves: boolean;
}

const isPerson = (model: ArchitectureModel, id: string): boolean =>
  model.nodes.find((n) => n.id === id)?.keyword === 'person';

/**
 * People with an edge to the hub move from a band to a free place beside the hub, where one straight flat line joins
 * them: all people who share a band with systems when there is room beside the hub for every one of them, so no row
 * mixes the two, and then as many as their band has more neighbours on the hub than the wider row of systems, so the
 * hub is only as wide as the systems it joins and does not run on under or over people. A caller goes to the left, a
 * called one to the right, each taken from that end of its band; who is linked to a neighbour in the band stays.
 */
export function besidePeople(
  model: ArchitectureModel,
  bands: Record<Side, Band>,
  beside: { readonly left: string | undefined; readonly right: string | undefined },
  linked: (id: string) => boolean,
): { bands: Record<Side, Band>; left: string | undefined; right: string | undefined } {
  const systems = (b: Band) => b.filter((id) => linked(id) && !isPerson(model, id)).length;
  const movable = (b: Band) => b.filter((id) => linked(id) && isPerson(model, id) && loose(model, id, b));
  const target = Math.max(1, systems(bands.top), systems(bands.bottom));
  let out = bands;
  const slots = { ...beside };
  const move = (side: Side): boolean => {
    const order = side === 'top' ? (['left', 'right'] as const) : (['right', 'left'] as const);
    const slot = order.find((s) => slots[s] === undefined);
    const fits = movable(out[side]);
    const pick = slot === 'left' ? fits[0] : fits.at(-1);
    if (slot === undefined || pick === undefined) return false;
    slots[slot] = pick;
    out = { ...out, [side]: out[side].filter((id) => id !== pick) };
    return true;
  };
  const mixed = (s: Side) => (systems(out[s]) > 0 ? movable(out[s]).length : 0);
  const free = [slots.left, slots.right].filter((s) => s === undefined).length;
  if (mixed('top') + mixed('bottom') <= free) {
    for (const side of ['top', 'bottom'] as const) for (let n = mixed(side); n > 0; n--) move(side);
  }
  for (let round = 0; round < 2; round++) {
    const excess = (s: Side) => out[s].filter(linked).length - target;
    const side: Side = excess('top') >= excess('bottom') ? 'top' : 'bottom';
    if (excess(side) <= 0 || !move(side)) break;
  }
  return { bands: out, ...slots };
}

/**
 * The band with a neighbour that has no edge to the hub swapped past the one beside it at an end of the band, when
 * both lie in the same group and it is not linked to the next one in: so it stands outside the hub's run and the hub
 * does not reach under or over it.
 */
export function outward(model: ArchitectureModel, band: Band, linked: (id: string) => boolean): Band {
  const out = [...band];
  const group = (id: string | undefined) => model.nodes.find((n) => n.id === id)?.group;
  const joined = (a: string | undefined, b: string | undefined) =>
    model.edges.some((e) => (e.from === a && e.to === b) || (e.from === b && e.to === a));
  const swap = (i: number, end: number, next: number) => {
    const [a, b] = [out[i], out[end]];
    if (a === undefined || b === undefined || linked(a) || !linked(b) || group(a) !== group(b)) return;
    if (joined(a, out[next])) return;
    out[i] = b;
    out[end] = a;
  };
  if (out.length > 2) {
    swap(out.length - 2, out.length - 1, out.length - 3);
    swap(1, 0, 2);
  }
  return out;
}

/** The first and last place in a band of a node with an edge to the hub, the whole band when none has. */
function linkedRange(band: Band, linked: (id: string) => boolean): readonly [number, number] {
  const at = band.flatMap((id, i) => (linked(id) ? [i] : []));
  return [at[0] ?? 0, at.at(-1) ?? band.length - 1];
}

/**
 * The columns of the bands and the hub: the hub is as wide as the longer run of neighbours on it, above or below,
 * and the shorter run stands centred on it; where that falls between two columns every column is halved and each
 * neighbour spans two halves, so every line to the hub still runs straight down the middle of its neighbour.
 */
export function placeBands(bands: Record<Side, Band>, linked: (id: string) => boolean): Placed {
  const sides = (['top', 'bottom'] as const).filter((s) => bands[s].length > 0);
  const range = (s: Side) => linkedRange(bands[s], linked);
  const run = (s: Side) => range(s)[1] - range(s)[0] + 1;
  const width = Math.max(1, ...sides.map(run));
  const start = (s: Side) => (width - run(s)) / 2 - range(s)[0];
  const lo = Math.min(0, ...sides.map(start));
  const hi = Math.max(width, ...sides.map((s) => start(s) + bands[s].length));
  const grain = sides.some((s) => !Number.isInteger(start(s))) ? 2 : 1;
  const at = (x: number) => Math.round((x - lo) * grain);
  const cols = Array.from({ length: at(hi) }, (_, k) => (grain === 1 ? `c${k + 1}` : `h.${k + 1}`));
  const spot = (x: number, span: number): Spot => ({
    col: cols[at(x)] ?? 'c1',
    to: cols[at(x) + span * grain - 1] ?? 'c1',
  });
  const spots = new Map(sides.flatMap((s) => bands[s].map((id, i) => [id, spot(start(s) + i, 1)] as const)));
  return { cols, hub: spot(0, width), spots, halves: grain === 2 };
}
