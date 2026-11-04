import type { Marker } from './styles.js';

/** Coordinates of rectangles, lines and texts: integers as they are, others with one decimal. */
export const num = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ''));

/**
 * A marker drawn in a grid of 12 units, scaled to `size`, as `<marker id="m-<id>">`. `suffix` and `cls` write a copy
 * for one area, `m-<id>-<suffix>` in a `<marker>` of that class, so the area's rules paint its outline.
 */
export function markerElement(m: Marker, size: number, suffix?: string, cls?: string): string {
  const unit = (n: number) => num((n * size) / 12);
  const outline =
    m.shape.points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${unit(x)} ${unit(y)}`).join(' ') +
    (m.shape.closed === true ? ' Z' : '');
  const id = suffix === undefined ? m.id : `${m.id}-${suffix}`;
  const of = cls === undefined ? '' : ` class="${cls}"`;
  return `<marker id="m-${id}"${of} markerUnits="userSpaceOnUse" markerWidth="${size}" markerHeight="${size}" refX="${unit(11)}" refY="${unit(6)}" orient="${m.orient ?? 'auto'}"><path d="${outline}" class="${m.name}" stroke-linecap="round"/></marker>`;
}
