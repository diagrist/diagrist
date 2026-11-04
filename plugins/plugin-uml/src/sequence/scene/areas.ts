import { type AreaMark, areaMark, domId, lineArea, type Shape } from '@diagrist/core';
import type { MessageEvent } from '../diagram.js';
import type { SeqShape, SequenceLayout } from '../layout/types.js';
import type { SequenceModel } from '../model/types.js';
import { nearestHead } from './cards.js';

/** The area of a lifeline end; gates, found and lost ends have none. */
const endArea = (m: SequenceModel, id: string): string | undefined => m.participants.get(id)?.area;

/** The area of a message: its own, else the coloured one of its sender, else of its receiver (ADR 0033). */
const messageArea = (m: SequenceModel, e: MessageEvent): string | undefined =>
  lineArea(m.diagram.areas, e.area, endArea(m, e.from), endArea(m, e.to));

/** The mark of the lifeline `id`, which its head, its dashed line and its bars share as one element. */
export const lifelineMark = (m: SequenceModel, id: string | undefined): AreaMark | undefined =>
  id === undefined ? undefined : areaMark(m.diagram.areas, endArea(m, id), 'body');

/**
 * The area marks of a sequence diagram by DOM id: the heads as bodies, the messages with their labels as lines,
 * `messages[k]` drawn as `edge-<k>`. A sequence diagram has no frame that groups lifelines.
 */
export function sequenceAreaMarks(m: SequenceModel, l: SequenceLayout): Map<string, AreaMark> {
  const out = new Map<string, AreaMark>();
  for (const h of l.heads) {
    const mark = lifelineMark(m, h.id);
    if (mark !== undefined) out.set(domId.node(h.id), mark);
  }
  l.messages.forEach((art, k) => {
    const e = m.diagram.events[art.index];
    const mark = e?.type === 'message' ? areaMark(m.diagram.areas, messageArea(m, e), 'line') : undefined;
    if (mark !== undefined) out.set(domId.edge(k), mark);
  });
  return out;
}

/** Shapes in a group of their area; outside an area they stay as they are, so a picture without areas keeps its bytes. */
export const inArea = (shapes: readonly Shape[], mark: AreaMark | undefined): Shape[] =>
  mark === undefined ? [...shapes] : [{ kind: 'group', area: mark, children: [...shapes] }];

/** The mark of an activation bar: that of the lifeline it lies on. */
export const barMark = (m: SequenceModel, l: SequenceLayout, bar: SeqShape): AreaMark | undefined =>
  bar.kind === 'rect' ? lifelineMark(m, nearestHead(bar.rect.x + bar.rect.w / 2, l.heads)?.id) : undefined;

/** The areas the picture paints something in, for its legend. */
export const usedAreas = (m: SequenceModel): Set<string> =>
  new Set(
    [
      ...m.diagram.participants.map((p) => p.area),
      ...m.diagram.events.map((e) => (e.type === 'message' ? messageArea(m, e) : undefined)),
    ].filter((a): a is string => a !== undefined),
  );
