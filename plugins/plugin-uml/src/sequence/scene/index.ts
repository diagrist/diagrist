import { type Anchors, domId, markAreas, type Scene, type Shape } from '@diagrist/core';
import { headerShapes, stripShapes, type Words, withAreaLegend } from '@diagrist/parts';
import type { PictureTexts } from '../layout/index.js';
import type { SeqShape, SequenceLayout } from '../layout/types.js';
import type { SequenceModel } from '../model/types.js';
import { barMark, inArea, lifelineMark, sequenceAreaMarks, usedAreas } from './areas.js';
import { cardHeads, cardShapes } from './cards.js';
import { messageShape, shape } from './shapes.js';

/**
 * The scene of a sequence diagram: title, lifelines, guides, bars, frames, boxes, messages, heads, marks,
 * annotations and decision bar, in this drawing order. `look=cards` draws heads and areas as cards. Lifelines
 * of a coloured area are painted in its tone, head, dashed line and bars alike, their messages in its ink (ADR 0033).
 */
export function sequenceScene(l: SequenceLayout, m: SequenceModel, words: Words & PictureTexts): Scene {
  const d = m.diagram;
  const cards = d.look === 'cards';
  const painted = (id: string) => m.participants.get(id)?.tone === undefined && lifelineMark(m, id) !== undefined;
  const area = (shapes: readonly SeqShape[]) =>
    cards ? cardShapes(shapes, l.heads, m.participants, painted) : shapes.map(shape);
  const heads = cards
    ? cardHeads(l.heads, m.participants, domId.node, painted)
    : l.heads.map((h): Shape => ({ kind: 'group', id: domId.node(h.id), children: h.shapes.map(shape) }));
  const children: Shape[] = [
    ...headerShapes(l.header, words.title, d.subtitle),
    ...l.lifelines.flatMap((s, i) => inArea([shape(s)], lifelineMark(m, l.heads[i]?.id))),
    ...l.guides.map(shape),
    ...l.activations.flatMap((s) => inArea(area([s]), barMark(m, l, s))),
    ...area(l.frames),
    ...area(l.boxes),
    ...l.messages.map((art, k) => messageShape(art, domId.edge(k))),
    ...heads,
    ...l.marks.map(shape),
    ...l.annotations.map(shape),
    ...stripShapes(l.strip, words),
  ];
  const scene: Scene = {
    width: l.width,
    height: l.height,
    title: d.title,
    areas: d.areas.paint,
    children: markAreas(children, sequenceAreaMarks(m, l)),
  };
  return withAreaLegend(scene, d.areas, usedAreas(m), cards ? 'cardBox' : 'head');
}

/** Heads as nodes, messages as edges in drawing order with the line that writes them; a sequence diagram has no groups. */
export function sequenceAnchors(l: SequenceLayout, m: SequenceModel): Anchors {
  return {
    width: l.width,
    height: l.height,
    nodes: l.heads.map((h) => ({ id: h.id, domId: domId.node(h.id), rect: h.rect })),
    groups: [],
    edges: l.messages.map((art, k) => ({
      index: k,
      from: art.from,
      to: art.to,
      domId: domId.edge(k),
      points: art.points,
      ...spanOf(m, art.index),
    })),
  };
}

function spanOf(m: SequenceModel, index: number) {
  const span = m.diagram.events[index]?.span;
  return span ? { span } : {};
}
