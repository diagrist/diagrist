import { domId, type Shape } from '@diagrist/core';
import type { EdgeLabel, Route } from '@diagrist/layout-grid';
import { markShapes } from '@diagrist/parts';
import type { ArchitectureLayout } from '../layout/index.js';
import type { ArchitectureModel } from '../model/types.js';
import { badgeShapes } from './bodies.js';
import { paperBadge, paperLabelShapes } from './paper.js';
import { type Surface, surfacesAt } from './surfaces.js';

/** Routes that have a label, a flow number or a mark, in route order; each gets its group `label-<i>`. */
export function labelledRoutes(layout: ArchitectureLayout): number[] {
  const all = [
    ...layout.labels.map((l) => l.route),
    ...layout.badges.map((b) => b.route),
    ...layout.marks.flatMap((m) => (m.route === undefined ? [] : [m.route])),
  ];
  return [...new Set(all)].sort((a, b) => a - b);
}

/**
 * A label with a halo in the colour of its ground: the canvas halo cuts the lines below, on a toned frame a ring
 * in its tone follows, and the text itself last without halo.
 */
function textShapes(l: EdgeLabel, accent: boolean, under: readonly Surface[]): Shape[] {
  const at = { x: l.x, y: l.y, text: l.text, font: 'label', anchor: l.anchor } as const;
  const tints = surfacesAt(under, l.box.x + l.box.w / 2, l.box.y + l.box.h / 2).map((s) => s.tone);
  const text = (role: string): Shape => ({ kind: 'text', ...at, role });
  const base = text(accent ? 'edgeLabelAccent' : 'edgeLabel');
  if (tints.length === 0) return [base];
  const ring = accent ? 'label-accent-halo' : 'label-halo';
  return [base, ...tints.map((t) => text(`${ring}-${t}`)), text(accent ? 'edgeLabelBareAccent' : 'edgeLabelBare')];
}

/** Per labelled route a group with its texts, flow number and marks; after them the marks at nodes. */
export function labelShapes(
  model: ArchitectureModel,
  routes: readonly Route[],
  layout: ArchitectureLayout,
  under: readonly Surface[],
): Shape[] {
  const accent = (route: number) => model.edges[Number(routes[route]?.edge)]?.step?.accent === true;
  const paper = model.look === 'paper';
  const badge = paper ? paperBadge : badgeShapes;
  const texts = (i: number) => {
    const own = layout.labels.filter((l) => l.route === i);
    return paper ? paperLabelShapes(own, under) : own.flatMap((l) => textShapes(l, accent(i), under));
  };
  const groups = labelledRoutes(layout).map(
    (i): Shape => ({
      kind: 'group',
      id: domId.label(i),
      children: [
        ...texts(i),
        ...layout.badges.filter((b) => b.route === i).flatMap((b) => badge(b.n, b.x, b.y, b.accent)),
        ...layout.marks.filter((m) => m.route === i).flatMap((m) => markShapes(m.id, m.x, m.y)),
      ],
    }),
  );
  const nodeMarks = layout.marks.filter((m) => m.route === undefined).flatMap((m) => markShapes(m.id, m.x, m.y));
  return [...groups, ...nodeMarks];
}
