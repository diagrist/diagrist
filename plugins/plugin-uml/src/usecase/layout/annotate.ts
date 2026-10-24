import { textWidth } from '@diagrist/core';
import { type EdgeLabel, type GridLayout, type GridSpec, occupancy, type Route } from '@diagrist/layout-grid';
import { isKnown } from '../diagram.js';
import type { UseCaseModel } from '../model.js';
import type { Comment } from './art.js';
import { commentLabels, extendComment } from './comment.js';
import { type Drawn, endTexts, middleText } from './labels.js';
import { lineOf } from './line.js';
import { UC_FONTS, UC_GRID } from './metrics.js';
import { placeNote } from './note.js';
import { edgeId, SUBJECT_TITLE } from './spec.js';

/** The relation of every route with its line, in the order of the routes. */
export function drawnOf(m: UseCaseModel, routes: readonly Route[]): Drawn[] {
  return routes.flatMap((r, route) => {
    const relation = m.diagram.relations.find((_, i) => edgeId(i) === r.edge);
    return relation && isKnown(relation) ? [{ relation, line: lineOf(r), route }] : [];
  });
}

/** Box of the role below a stick figure. */
export function captionBoxes(spec: GridSpec, layout: GridLayout) {
  return layout.nodes.flatMap((p) => {
    const c = spec.nodes.find((n) => n.id === p.id)?.caption;
    if (!c) return [];
    return [{ id: p.id, rect: { x: p.rect.x + p.rect.w / 2 - c.w / 2, y: p.rect.y + p.rect.h, w: c.w, h: c.below } }];
  });
}

/** Labels and comments of a laid out diagram. */
export interface Annotations {
  readonly labels: readonly EdgeLabel[];
  readonly comments: readonly Comment[];
}

/**
 * Labels of a use case diagram: stereotype and name at the middle of every line, multiplicities at the ends,
 * condition and extension points of an extend as a note beside it, notes on elements as comments with a link. Every
 * text looks for a spot without nodes, lines, frame lines and other texts, within the sheet.
 */
export function annotate(m: UseCaseModel, spec: GridSpec, layout: GridLayout, routes: readonly Route[]): Annotations {
  const top = Math.min(
    ...layout.groups.map((g) => g.rect.y),
    ...layout.nodes.map((n) => n.rect.y),
    ...layout.rows.slice(0, 1).map((r) => r.y - UC_GRID.framePad.top),
  );
  const margin = UC_GRID.margin;
  const area = { x: margin, y: top, w: layout.width - 2 * margin, h: layout.bottom - top };
  const room = occupancy(spec, layout, routes, { area });
  const font = UC_FONTS.name;
  for (const g of layout.groups) {
    const label = m.subjects.get(g.id)?.label ?? '';
    const x = g.rect.x + SUBJECT_TITLE.x;
    room.take({ x, y: g.rect.y + SUBJECT_TITLE.y - font.size, w: textWidth(label, font), h: font.size + 4 });
  }
  for (const c of captionBoxes(spec, layout)) room.take(c.rect);
  const drawn = drawnOf(m, routes);
  const labels: EdgeLabel[] = drawn.flatMap((d) => [
    ...middleText(d, room),
    ...endTexts(
      d,
      room,
      m,
      layout,
      drawn.filter((o) => o !== d).map((o) => o.line),
    ),
  ]);
  const comments = drawn.flatMap((d) => extendComment(d, room) ?? []);
  labels.push(...comments.flatMap(commentLabels));
  const isActor = (id: string) => m.actors.has(id);
  for (const note of m.diagram.notes) {
    const c = placeNote(note, isActor, spec, layout, room);
    if (c) comments.push(c);
  }
  return { labels, comments };
}
