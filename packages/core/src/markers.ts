import type { Shape } from './scene.js';
import type { Marker, Styles } from './styles.js';

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

/** The markers a scene's paths end in: those `<defs>` holds, and the classes that paint any of them. */
export interface MarkersInUse {
  /** Markers referenced by a path outside every area; inside one a path ends in the area's copy (ADR 0033). */
  readonly plain: readonly Marker[];
  /** Classes of every marker referenced, inside areas too, whose copies are painted by the same rules. */
  readonly classes: ReadonlySet<string>;
}

/** Finds the markers the paths among `shapes` end in or start with, at any depth, so only those are written. */
export function markersInUse(shapes: readonly Shape[], styles: Styles): MarkersInUse {
  const plain = new Set<string>();
  const all = new Set<string>();
  const visit = (list: readonly Shape[], inArea: boolean): void => {
    for (const shape of list) {
      if (shape.kind === 'group') visit(shape.children, inArea || shape.area !== undefined);
      const role = shape.kind === 'path' ? styles.roles[shape.role] : undefined;
      for (const id of [role?.marker, role?.markerStart]) {
        if (id === undefined) continue;
        all.add(id);
        if (!inArea) plain.add(id);
      }
    }
  };
  visit(shapes, false);
  return {
    plain: styles.markers.filter((m) => plain.has(m.id)),
    classes: new Set(styles.markers.filter((m) => all.has(m.id)).map((m) => m.name)),
  };
}
