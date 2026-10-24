import { domId, type Scene, type Shape } from '@diagrist/core';
import type { ArchitectureLayout, PlacedFrame } from '../../layout/index.js';
import type { ArchitectureModel } from '../../model/types.js';
import { edgeShapes } from '../../scene/edges.js';
import { noteShapes } from '../../scene/extras.js';
import type { Texts } from '../../texts/index.js';
import { type Focus, focusOf } from './focus.js';
import { columnsLabelShapes, markSign, numberSign } from './labels.js';
import { columnsNodeShapes } from './nodes.js';
import type { ColumnsSheet } from './sheet.js';

/** Where the title of a zone stands: inside its top right corner, the team below it. */
const ZONE = { inset: 16, title: 24, team: 40 } as const;

/** A frame that names no band: a dashed grey zone with its title at the top right. */
function zoneShapes(f: PlacedFrame, texts: Texts): Shape {
  const { group: g, rect } = f;
  const x = rect.x + rect.w - ZONE.inset;
  const team = g.team ?? (g.role ? texts.roles[g.role] : '');
  const title: Shape[] = g.title
    ? [{ kind: 'text', x, y: rect.y + ZONE.title, text: g.title, role: 'frameTitle', font: 'title', anchor: 'end' }]
    : [];
  const sub: Shape[] =
    g.title && team
      ? [{ kind: 'text', x, y: rect.y + ZONE.team, text: team, role: 'frameTeam', font: 'note', anchor: 'end' }]
      : [];
  return {
    kind: 'group',
    id: domId.group(g.id),
    children: [{ kind: 'rect', ...rect, role: 'frame' }, ...title, ...sub],
  };
}

/** Edges as the standard scene draws them, the ones outside the focus with the roles of context. */
function edges(model: ArchitectureModel, layout: ArchitectureLayout, focus: Focus): Shape[] {
  return edgeShapes(model, layout.routes, [], layout.sizing.m.markerSize).map((group, i): Shape => {
    const route = layout.routes[i];
    if (group.kind !== 'group' || !route || !focus.edge(model.edges[Number(route.edge)])) return group;
    const children = group.children.map(
      (s): Shape =>
        s.kind === 'path' && /^edge-[a-z]+(-accent)?$/.test(s.role)
          ? { ...s, role: `${s.role.replace(/-accent$/, '')}-context` }
          : s,
    );
    return { ...group, children };
  });
}

/** Bands, separators, texts and signs of the sheet. */
function sheetShapes(sheet: ColumnsSheet): { under: Shape[]; over: Shape[] } {
  return {
    under: [
      ...sheet.bands.map((b): Shape => ({ kind: 'rect', ...b, role: 'band' })),
      ...sheet.separators.map((s): Shape => ({ kind: 'line', ...s, role: 'separator' })),
    ],
    over: [
      ...sheet.texts.map((t): Shape => ({ kind: 'text', ...t })),
      ...sheet.signs.flatMap((s) =>
        s.kind === 'mark' ? markSign(s.text, s.x, s.y) : numberSign(s.text, s.x, s.y, s.kind === 'stepContext'),
      ),
    ],
  };
}

/**
 * The picture of `look=columns` in drawing order: bands and separators, zones, elements, notes with square corners,
 * edges, their texts with flow numbers and marks, then the texts of bands, side column and footer.
 */
export function columnsScene(model: ArchitectureModel, layout: ArchitectureLayout, texts: Texts): Scene {
  const focus = focusOf(model);
  const m = layout.sizing.m;
  const sheet = layout.columns ? sheetShapes(layout.columns) : { under: [], over: [] };
  const notes = noteShapes(layout.notes).map(
    (n): Shape =>
      n.kind === 'group' ? { ...n, children: n.children.map((c) => (c.kind === 'rect' ? { ...c, rx: 0 } : c)) } : n,
  );
  const children: Shape[] = [
    ...sheet.under,
    ...layout.frames.map((f) => zoneShapes(f, texts)),
    ...columnsNodeShapes(layout.nodes, layout.routes, focus, m),
    ...notes,
    ...edges(model, layout, focus),
    ...columnsLabelShapes(model, layout, focus, m),
    ...sheet.over,
  ];
  return { width: layout.width, height: layout.height, title: model.title, children };
}
