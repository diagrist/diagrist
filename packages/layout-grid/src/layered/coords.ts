import { isotoneApart } from './isotone.js';
import type { Neighbours } from './order.js';
import type { Ranked } from './rank.js';

/** How far each node's centre stands from the left, after the passes, by id. */
export type Xs = Map<string, number>;

/** What the placement needs besides the order: widths, the least gap between two neighbours, the links. */
export interface CoordsInput {
  readonly layers: readonly (readonly string[])[];
  readonly width: (id: string) => number;
  /** Least distance between the facing edges of two neighbours in a layer. */
  readonly gap: (left: string, right: string) => number;
  readonly links: Neighbours;
  readonly ranked: Ranked;
  /** Links of a chain, upper end first, which stand straight where their layers have room: see `spinesOf`. */
  readonly spines?: readonly (readonly [string, string])[];
  /** Nodes whose ends stand at fixed points, such as the tip of a diamond, so a chain cannot slide along them. */
  readonly fixed?: (n: string) => boolean;
}

/** Passes alternate down and up; each pulls the nodes of a layer towards their partners in the layer before. */
const PASSES = ['down', 'up', 'down', 'up', 'down'] as const;
/** A node without partners in the pass's direction holds its place with this little weight. */
const LOOSE = 0.001;

const sepOf = (input: CoordsInput, a: string, b: string) => (input.width(a) + input.width(b)) / 2 + input.gap(a, b);

/**
 * Places one layer as near its partners as its gaps allow, `refs` being the layer the pass looks at. A node without
 * partners there keeps its place, or comes as near as it may to its partners beside it.
 */
function place(input: CoordsInput, x: Xs, layer: readonly string[], refs: ReadonlySet<string> | undefined): void {
  const desired: number[] = [];
  const weights: number[] = [];
  for (const n of layer) {
    const partners = (input.links.adj.get(n) ?? []).filter((m) => refs === undefined || refs.has(m));
    const pulls = partners.filter((m) => !layer.includes(m));
    const w = pulls.map((m) => input.links.weight.get(n < m ? `${n}|${m}` : `${m}|${n}`) ?? 1);
    const total = w.reduce((s, v) => s + v, 0);
    const beside = (input.links.adj.get(n) ?? []).filter((m) => layer.includes(m));
    const near =
      beside.length === 0 ? (x.get(n) ?? 0) : beside.reduce((s, m) => s + (x.get(m) ?? 0), 0) / beside.length;
    desired.push(total === 0 ? near : pulls.reduce((s, m, i) => s + (x.get(m) ?? 0) * (w[i] as number), 0) / total);
    weights.push(total === 0 ? LOOSE : total);
  }
  const seps = layer.slice(1).map((n, i) => sepOf(input, layer[i] as string, n));
  isotoneApart(desired, weights, seps).forEach((v, i) => {
    x.set(layer[i] as string, v);
  });
}

/** Room a node has in its layer without passing its neighbours: the least and most centre it may take. */
function room(input: CoordsInput, x: Xs, layer: readonly string[], n: string): [number, number] {
  const i = layer.indexOf(n);
  const left = layer[i - 1];
  const right = layer[i + 1];
  return [
    left === undefined ? Number.NEGATIVE_INFINITY : (x.get(left) ?? 0) + sepOf(input, left, n),
    right === undefined ? Number.POSITIVE_INFINITY : (x.get(right) ?? 0) - sepOf(input, n, right),
  ];
}

/** Moves `n` to `to` when its layer has room there; whether it moved. */
function tryMove(input: CoordsInput, x: Xs, n: string, to: number): boolean {
  const layer = input.layers.find((l) => l.includes(n)) ?? [];
  const [lo, hi] = room(input, x, layer, n);
  if (to < lo - 0.5 || to > hi + 0.5) return false;
  x.set(n, to);
  return true;
}

/**
 * Every chain of placeholders on one vertical: under the middle of its upper end, else over that of its lower end,
 * else as near where it stands most as the side of either end reaches, so its port can slide there, else there.
 */
function straighten(input: CoordsInput, x: Xs): void {
  for (const chain of input.ranked.chains.values()) {
    const inner = chain.slice(1, -1);
    if (inner.length === 0) continue;
    const ends = [chain[0] as string, chain.at(-1) as string];
    const middle = [...inner.map((d) => x.get(d) ?? 0)].sort((a, b) => a - b)[Math.floor(inner.length / 2)] ?? 0;
    const within = (n: string) => {
      const reach = input.fixed?.(n) ? 0 : Math.max(0, input.width(n) / 2 - Math.min(16, input.width(n) / 4));
      const c = x.get(n) ?? 0;
      return Math.min(c + reach, Math.max(c - reach, middle));
    };
    for (const target of [...ends.map((n) => x.get(n) ?? 0), ...ends.map(within), middle]) {
      const saved = inner.map((d) => x.get(d) ?? 0);
      if (inner.every((d) => tryMove(input, x, d, target))) break;
      inner.forEach((d, i) => {
        x.set(d, saved[i] as number);
      });
    }
  }
}

/** Partners of `n` in the layer below (`dl` 1) or above (-1), by the links. */
const partners = (input: CoordsInput, n: string, dl: number): string[] => {
  const l = input.ranked.layerOf.get(n) ?? 0;
  return (input.links.adj.get(n) ?? []).filter((m) => input.ranked.layerOf.get(m) === l + dl);
};

const weightOf = (input: CoordsInput, a: string, b: string) =>
  input.links.weight.get(a < b ? `${a}|${b}` : `${b}|${a}`) ?? 1;

/** The partners in the layer below or above that the strongest links join, such as a hierarchy over a deputy. */
const strongest = (input: CoordsInput, n: string, dl: number): string[] => {
  const all = partners(input, n, dl);
  const top = Math.max(0, ...all.map((m) => weightOf(input, n, m)));
  return all.filter((m) => weightOf(input, n, m) === top);
};

/**
 * Parents over the middle of their children; a child whose strongest link above goes to one parent, which has no
 * other child by such a link, exactly below it, else the parent above the child.
 */
function centre(input: CoordsInput, x: Xs): void {
  for (const layer of input.layers)
    for (const n of layer) {
      const kids = partners(input, n, 1);
      if (kids.length < 2 || partners(input, n, -1).length > 0) continue;
      if (kids.some((k) => partners(input, k, -1).length !== 1)) continue;
      const xs = kids.map((k) => x.get(k) ?? 0);
      tryMove(input, x, n, (Math.min(...xs) + Math.max(...xs)) / 2);
    }
  for (const layer of input.layers)
    for (const n of layer) {
      const up = strongest(input, n, -1);
      const parent = up[0];
      if (up.length !== 1 || parent === undefined || strongest(input, parent, 1).length !== 1) continue;
      if (!tryMove(input, x, n, x.get(parent) ?? 0)) tryMove(input, x, parent, x.get(n) ?? 0);
    }
}

/**
 * The centre of every node: layers packed from the left, then passes that pull each layer towards its partners
 * in the layer before as far as real widths and gaps allow, placeholder chains straightened, parents centred over
 * their children and single children set exactly below their parent, then the links of chains straight, top down.
 * Shifted so the leftmost box starts at `left` and rounded to whole pixels.
 */
export function coords(input: CoordsInput, left: number): Xs {
  const x: Xs = new Map();
  for (const layer of input.layers) {
    let at = 0;
    layer.forEach((n, i) => {
      if (i > 0) at += sepOf(input, layer[i - 1] as string, n);
      x.set(n, at);
    });
  }
  for (const pass of PASSES) {
    const order = pass === 'down' ? input.layers : [...input.layers].reverse();
    order.forEach((layer, i) => {
      const prev = order[i - 1];
      place(input, x, layer, prev === undefined ? new Set() : new Set(prev));
    });
  }
  straighten(input, x);
  centre(input, x);
  straighten(input, x);
  for (const [upper, lower] of input.spines ?? [])
    if (!tryMove(input, x, lower, x.get(upper) ?? 0)) tryMove(input, x, upper, x.get(lower) ?? 0);
  const min = Math.min(...[...x].map(([n, v]) => v - input.width(n) / 2));
  return new Map([...x].map(([n, v]) => [n, Math.round(v - min + left)]));
}

/** An edge as `spinesOf` reads it: its ends, its bundle, and whether it is drawn. */
interface SpineEdge {
  readonly id: string;
  readonly bundle?: string;
  readonly hidden?: boolean;
}

/**
 * The links of chains: edges between neighbouring layers whose upper end has no other edge of the same bundle
 * going down and whose lower end takes no other edge of it from above, two or more in a row, such as a pipeline of
 * stages each handing on to one next. Edges without a bundle count as one kind. Top down, so a chain straightens
 * from its head.
 */
export function spinesOf(edges: readonly SpineEdge[], ranked: Ranked): [string, string][] {
  const ends = edges.flatMap((e) => {
    const chain = ranked.chains.get(e.id);
    const [upper, lower] = [chain?.[0], chain?.at(-1)];
    return e.hidden === true || upper === undefined || lower === undefined
      ? []
      : [{ key: e.bundle ?? '', upper, lower, short: chain?.length === 2 }];
  });
  const count = (side: 'upper' | 'lower', n: string, key: string) =>
    ends.filter((e) => e[side] === n && e.key === key).length;
  const links = ends.filter(
    (e) => e.short && count('upper', e.upper, e.key) === 1 && count('lower', e.lower, e.key) === 1,
  );
  return links
    .filter((e) => links.some((f) => f.lower === e.upper || f.upper === e.lower))
    .sort((a, b) => (ranked.layerOf.get(a.upper) ?? 0) - (ranked.layerOf.get(b.upper) ?? 0))
    .map((e): [string, string] => [e.upper, e.lower]);
}
