import { type Anchors, domId, type Scene, type Shape } from '@diagrist/core';
import { stripShapes } from '../../shared/strip-scene.js';
import type { Words } from '../../texts/index.js';
import type { SequenceDiagram } from '../diagram.js';
import type { PictureTexts } from '../layout/index.js';
import type { SeqShape, SequenceLayout } from '../layout/types.js';
import type { SequenceModel } from '../model/types.js';
import { cardHeads, cardShapes } from './cards.js';
import { messageShape, shape } from './shapes.js';

function titleShapes(l: SequenceLayout, d: SequenceDiagram, words: PictureTexts): Shape[] {
  const { title, subtitle } = l.header;
  const out: Shape[] = [{ kind: 'text', ...title, text: words.title, role: 'title', font: 'title' }];
  if (d.subtitle) out.push({ kind: 'text', ...subtitle, text: d.subtitle, role: 'subtitle', font: 'note' });
  return out;
}

/**
 * The scene of a sequence diagram: title, lifelines, guides, bars, frames, boxes, messages, heads, marks,
 * annotations and decision bar, in this drawing order. `look=cards` draws heads and areas as cards.
 */
export function sequenceScene(l: SequenceLayout, m: SequenceModel, words: Words & PictureTexts): Scene {
  const d = m.diagram;
  const cards = d.look === 'cards';
  const area = (shapes: readonly SeqShape[]) =>
    cards ? cardShapes(shapes, l.heads, m.participants) : shapes.map(shape);
  const heads = cards
    ? cardHeads(l.heads, m.participants, domId.node)
    : l.heads.map((h): Shape => ({ kind: 'group', id: domId.node(h.id), children: h.shapes.map(shape) }));
  const children: Shape[] = [
    ...titleShapes(l, d, words),
    ...l.lifelines.map(shape),
    ...l.guides.map(shape),
    ...area(l.activations),
    ...area(l.frames),
    ...area(l.boxes),
    ...l.messages.map((art, k) => messageShape(art, domId.edge(k))),
    ...heads,
    ...l.marks.map(shape),
    ...l.annotations.map(shape),
    ...stripShapes(l.strip, words),
  ];
  return { width: l.width, height: l.height, title: d.title, children };
}

/** Heads as nodes, messages as edges in drawing order; a sequence diagram has no groups. */
export function sequenceAnchors(l: SequenceLayout): Anchors {
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
    })),
  };
}
