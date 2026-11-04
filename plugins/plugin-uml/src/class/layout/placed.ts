import type { Placed, Rect } from '@diagrist/core';
import type { EdgeLabel, PlacedGroup } from '@diagrist/layout-grid';
import { homed } from '../../shared/homed.js';
import type { NoteArt } from '../../shared/notes.js';
import { type ClassModel, packagesAround } from '../model.js';
import { CLASS, tabWidth } from './metrics.js';
import type { Routed } from './routed.js';

/** The tab of a package: its head at the top left of the frame, as wide as its name. */
export const tabOf = (m: ClassModel, g: PlacedGroup): Rect => ({
  x: g.rect.x,
  y: g.rect.y,
  w: Math.min(g.rect.w, tabWidth(m.packages.get(g.id)?.label ?? g.id)),
  h: CLASS.tabH,
});

/**
 * What the kernel's placement check and the line check read: packages and classifiers in their packages, the tab of
 * each package as the head of its frame, the texts of each relation keyed `<edge>.label.<n>`, and the notes, each
 * text and note in the innermost package around it.
 */
export function classPlaced(
  m: ClassModel,
  r: Routed,
  labels: readonly EdgeLabel[],
  notes: readonly NoteArt[],
): Placed[] {
  const within = (id: string) => {
    const p = packagesAround(m, id)[0];
    return p !== undefined && r.grid.groups.some((g) => g.id === p) ? { within: p } : {};
  };
  const source = (id: string) => {
    const span = (m.classifiers.get(id) ?? m.associations.get(id) ?? m.packages.get(id))?.span;
    return span ? { span } : {};
  };
  const counts = new Map<string, number>();
  return [
    ...r.grid.groups.map((g): Placed => ({ key: g.id, kind: 'box', rect: g.rect, ...within(g.id), ...source(g.id) })),
    ...r.grid.groups.map((g): Placed => ({ key: `${g.id}.name`, kind: 'text', rect: tabOf(m, g), within: g.id })),
    ...r.grid.nodes.map((n): Placed => ({ key: n.id, kind: 'box', rect: n.rect, ...within(n.id), ...source(n.id) })),
    ...labels.flatMap((l): Placed[] => {
      const edge = r.routes[l.route]?.edge;
      if (edge === undefined) return [];
      const n = (counts.get(edge) ?? 0) + 1;
      counts.set(edge, n);
      const span = r.relations[l.route]?.span;
      return [{ key: `${edge}.label.${n}`, kind: 'text', rect: l.box, ...(span ? { span } : {}) }];
    }),
    ...notes.map((n, i): Placed => ({ key: `${n.on}.note.${i + 1}`, kind: 'box', rect: n.rect })),
  ].map((p) => homed(p, r.grid));
}
