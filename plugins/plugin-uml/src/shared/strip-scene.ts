import type { Shape } from '@diagrist/core';
import type { Words } from '../words.js';
import { questionText, type Strip } from './strip.js';

const MARK_W = 24;
const MARK_H = 14;
const TEXT_DY = 3.5;
const CARD_RX = 8;

/** A decision mark (E1, E2 ...), centred on (x, y). */
export function markShapes(id: string, x: number, y: number): Shape[] {
  return [
    { kind: 'rect', x: x - MARK_W / 2, y: y - MARK_H / 2, w: MARK_W, h: MARK_H, rx: 3, role: 'mark' },
    { kind: 'text', x, y: y + TEXT_DY, text: id, role: 'markText', font: 'mark', anchor: 'middle' },
  ];
}

/** The decision bar: heading and one card per decision; open decisions are drawn dashed. */
export function stripShapes(strip: Strip, words: Words): Shape[] {
  if (strip.cards.length === 0) return [];
  const out: Shape[] = [{ kind: 'text', ...strip.heading, text: words.decisions, role: 'stripHeading', font: 'group' }];
  for (const card of strip.cards) {
    const d = card.decision;
    const { x, y, w, h } = card;
    out.push({ kind: 'rect', x, y, w, h, rx: CARD_RX, role: d.open ? 'decisionOpen' : 'decision' });
    out.push({ kind: 'text', ...card.question, text: questionText(d, words.open), role: 'decisionNote', font: 'note' });
    out.push({ kind: 'text', ...card.choice, text: d.choice, role: 'decisionChoice', font: 'name' });
    if (d.consequence)
      out.push({ kind: 'text', ...card.consequence, text: d.consequence, role: 'decisionNote', font: 'note' });
  }
  return out;
}
