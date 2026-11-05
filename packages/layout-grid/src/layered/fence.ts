import type { Xs } from './coords.js';

/**
 * Boxes kept to the left or right of a core moved out past the widest layer of the core, `gap` beyond its edge, with
 * whatever stands beyond them in their layer; they already stand at the outside of their layer, so the order holds.
 */
export function clearCore(
  x: Xs,
  layers: readonly (readonly string[])[],
  width: (id: string) => number,
  core: ReadonlySet<string>,
  pins: ReadonlyMap<string, 'left' | 'right'>,
  gap: number,
): void {
  const inner = [...core].filter((n) => x.has(n));
  if (inner.length === 0 || pins.size === 0) return;
  const left = Math.min(...inner.map((n) => (x.get(n) ?? 0) - width(n) / 2));
  const right = Math.max(...inner.map((n) => (x.get(n) ?? 0) + width(n) / 2));
  for (const layer of layers) {
    const outer = layer.filter((n) => pins.get(n) === 'right');
    const first = outer[0];
    if (first !== undefined) {
      const shift = Math.max(0, right + gap - ((x.get(first) ?? 0) - width(first) / 2));
      for (const n of layer.slice(layer.indexOf(first))) x.set(n, (x.get(n) ?? 0) + shift);
    }
    const inside = layer.filter((n) => pins.get(n) === 'left').at(-1);
    if (inside !== undefined) {
      const shift = Math.max(0, (x.get(inside) ?? 0) + width(inside) / 2 - (left - gap));
      for (const n of layer.slice(0, layer.indexOf(inside) + 1)) x.set(n, (x.get(n) ?? 0) - shift);
    }
  }
  const min = Math.min(...[...x].map(([n, v]) => v - width(n) / 2));
  const keep = Math.min(...[...x].filter(([n]) => !pins.has(n)).map(([n, v]) => v - width(n) / 2));
  if (min < keep) for (const [n, v] of x) x.set(n, v + (keep - min));
}
