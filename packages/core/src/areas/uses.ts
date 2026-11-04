import type { Shape } from '../scene.js';
import { classesOf, type Styles } from '../styles.js';
import { type AreaUse, areaClass } from './paint.js';

/**
 * What each area class of the scene holds: the classes below its groups and the markers of their paths. A marker
 * used inside an area is painted by the area's line class, which its copy carries.
 */
export function areaUses(
  shapes: readonly Shape[],
  styles: Styles,
  into: Map<string, AreaUse> = new Map(),
): Map<string, AreaUse> {
  for (const shape of shapes) {
    if (shape.kind !== 'group') continue;
    if (shape.area !== undefined) {
      const use = entry(into, shape.area);
      shapesOf(shape.children, styles, use);
      const lines = entry(into, { tone: shape.area.tone, as: 'line' });
      for (const marker of markersOf(shape.children, styles)) {
        lines.markers.add(marker.id);
        drawnOn(lines, marker.name, 'marker');
      }
    }
    areaUses(shape.children, styles, into);
  }
  return into;
}

/** Records that `name` is drawn on a shape of `kind` inside the area. */
function drawnOn(use: AreaUse, name: string, kind: string): void {
  use.classes.add(name);
  const kinds = use.on.get(name) ?? new Set<string>();
  kinds.add(kind);
  use.on.set(name, kinds);
}

/** The classes below the groups of an area, each with the kinds of shape it is drawn on. */
function shapesOf(shapes: readonly Shape[], styles: Styles, use: AreaUse): void {
  for (const shape of shapes) {
    if (shape.role !== undefined) for (const name of classesOf(shape.role, styles)) drawnOn(use, name, shape.kind);
    if (shape.kind === 'text')
      for (const run of shape.runs ?? [])
        for (const name of classesOf(run.role ?? shape.role, styles)) drawnOn(use, name, 'text');
    if (shape.kind === 'group') shapesOf(shape.children, styles, use);
  }
}

function entry(uses: Map<string, AreaUse>, mark: AreaUse['mark']): AreaUse {
  const key = areaClass(mark);
  const found = uses.get(key) ?? { mark, classes: new Set<string>(), on: new Map(), markers: new Set<string>() };
  uses.set(key, found);
  return found;
}

/** The markers the paths among `shapes` end in, at any depth. */
function markersOf(shapes: readonly Shape[], styles: Styles): Styles['markers'] {
  const ids = new Set<string>();
  const visit = (list: readonly Shape[]) => {
    for (const shape of list) {
      if (shape.kind === 'group') visit(shape.children);
      const role = shape.kind === 'path' ? styles.roles[shape.role] : undefined;
      for (const id of [role?.marker, role?.markerStart]) if (id !== undefined) ids.add(id);
    }
  };
  visit(shapes);
  return styles.markers.filter((m) => ids.has(m.id));
}
