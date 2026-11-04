import type { LayeredSpec } from './spec.js';

/** Where a box of a hub picture stands: its layer, and the outside of the layer it keeps to, if any. */
export interface Docked {
  readonly layer: ReadonlyMap<string, number>;
  readonly pin: ReadonlyMap<string, 'left' | 'right'>;
}

/** The extensions: every cluster outside the core, and every other part outside it that hangs together. */
function extensionsOf(spec: LayeredSpec, core: ReadonlySet<string>): string[][] {
  const outside = spec.nodes.filter((n) => !core.has(n.id));
  const byCluster = new Map<string, string[]>();
  for (const n of outside) {
    const key = n.cluster ?? `#${n.id}`;
    byCluster.set(key, [...(byCluster.get(key) ?? []), n.id]);
  }
  const parts = [...byCluster.values()];
  const loose = parts.filter((p) => p.length === 1 && spec.nodes.find((n) => n.id === p[0])?.cluster === undefined);
  const merged = parts.filter((p) => !loose.includes(p));
  for (const [one] of loose) {
    const partner = merged.find((p) =>
      spec.edges.some((e) => (e.from === one && p.includes(e.to)) || (e.to === one && p.includes(e.from))),
    );
    if (partner && one !== undefined) partner.push(one);
    else if (one !== undefined) merged.push([one]);
  }
  return merged;
}

/** An extension of a hub picture: its boxes, the boxes of the core it meets, and the sides it may dock at. */
export interface Extension {
  readonly part: readonly string[];
  readonly contacts: readonly string[];
  readonly sides: readonly Side[];
}

/** A side of the core an extension docks at. */
export type Side = 'top' | 'bottom' | 'left' | 'right';
const SIDES: readonly Side[] = ['top', 'bottom', 'left', 'right'];

const touching = (spec: LayeredSpec, part: readonly string[], other: (n: string) => boolean) =>
  spec.edges.filter((e) => (part.includes(e.from) && other(e.to)) || (part.includes(e.to) && other(e.from)));

/**
 * The extensions of a hub picture and where each may dock: above when it meets the top layer of the core, below
 * when it meets the bottom layer, at the left and right always, since the order brings its contact to the outside.
 */
export function extensions(spec: LayeredSpec, own: ReadonlyMap<string, number>): Extension[] {
  const inner = new Set(own.keys());
  const last = Math.max(0, ...own.values());
  return extensionsOf(spec, inner).map((part) => {
    const contacts = touching(spec, part, (n) => inner.has(n)).map((e) => (inner.has(e.from) ? e.from : e.to));
    const layers = contacts.map((c) => own.get(c) ?? 0);
    const sides = SIDES.filter((s) =>
      s === 'top' ? layers.includes(0) : s === 'bottom' ? layers.includes(last) : true,
    );
    return { part, contacts, sides };
  });
}

/**
 * The first guess of the sides: extensions with the fewest choices first, each at the side where the extensions it
 * is joined to stand, else the emptiest, in the order top, bottom, left, right.
 */
export function firstSides(spec: LayeredSpec, parts: readonly Extension[]): Side[] {
  const sides: (Side | undefined)[] = parts.map(() => undefined);
  const order = parts
    .map((_, i) => i)
    .sort((a, b) => (parts[a]?.sides.length ?? 0) - (parts[b]?.sides.length ?? 0) || a - b);
  for (const i of order) {
    const p = parts[i] as Extension;
    const score = (s: Side) => {
      const there = parts.filter((_, k) => sides[k] === s);
      const joined = there.filter((q) => touching(spec, p.part, (n) => q.part.includes(n)).length > 0).length;
      return there.length - 2 * joined;
    };
    sides[i] = [...p.sides].sort((a, b) => score(a) - score(b) || SIDES.indexOf(a) - SIDES.indexOf(b))[0];
  }
  return sides.map((s) => s ?? 'bottom');
}

/**
 * The layers of a hub picture with the extensions at `sides`. The core keeps the layers it has laid out alone
 * (`own`). An extension's boxes stand by their distance from the core: above and below in rows outside the core,
 * left and right in the layers of the core from the contact's layer upwards, kept to the outside of their layer.
 */
export function dock(
  spec: LayeredSpec,
  own: ReadonlyMap<string, number>,
  parts: readonly Extension[],
  sides: readonly Side[],
): Docked {
  const inner = new Set(own.keys());
  const last = Math.max(0, ...own.values());
  const layer = new Map<string, number>(own);
  const pin = new Map<string, 'left' | 'right'>();
  parts.forEach((p, i) => {
    const depth = new Map<string, number>();
    const queue = p.part.filter((n) => touching(spec, [n], (m) => inner.has(m)).length > 0);
    for (const n of queue) depth.set(n, 0);
    for (let k = 0; k < queue.length; k++) {
      const n = queue[k] as string;
      for (const e of touching(spec, [n], (m) => p.part.includes(m))) {
        const m = e.from === n ? e.to : e.from;
        if (!depth.has(m)) {
          depth.set(m, (depth.get(n) ?? 0) + 1);
          queue.push(m);
        }
      }
    }
    const side = sides[i] ?? 'bottom';
    const contactLayer = Math.min(last, ...p.contacts.map((c) => own.get(c) ?? 0));
    for (const n of p.part) {
      const d = depth.get(n) ?? 0;
      if (side === 'top') layer.set(n, -1 - d);
      else if (side === 'bottom') layer.set(n, last + 1 + d);
      else {
        layer.set(n, contactLayer - d);
        pin.set(n, side);
      }
    }
  });
  return { layer, pin };
}
