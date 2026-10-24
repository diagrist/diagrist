import type { Rect } from '@diagrist/core';
import { labelWidth, type Measured, type SeqCtx } from './text.js';
import type { SeqShape } from './types.js';

/**
 * Label of a message on a knocked-out ground, so lifelines and bars do not cross the text. The number
 * (`autonumber`) stands bold before the first line, the mark after the text.
 */
export function messageLabel(
  text: Measured,
  x: number,
  firstBaseline: number,
  anchor: 'start' | 'middle',
  c: SeqCtx,
  emph: boolean,
): SeqShape[] {
  const total = labelWidth(text, c);
  if (total === 0) return [];
  const { lineH: lh, messageSize: size, knockout, descent, textMid } = c.s;
  const left = anchor === 'middle' ? x - total / 2 : x;
  const back: Rect = {
    x: left - knockout,
    y: firstBaseline - lh + descent,
    w: total + 2 * knockout,
    h: Math.max(1, text.lines.length) * lh,
  };
  const out: SeqShape[] = [{ kind: 'rect', rect: back, role: 'knockout' }];
  const role = emph ? 'messageEmph' : 'message';
  const center = left + text.w / 2;
  text.lines.forEach((line, k) => {
    const y = firstBaseline + k * lh;
    if (k > 0 || text.number === undefined) {
      out.push({ kind: 'text', at: { x: anchor === 'middle' ? center : left, y }, text: line, role, anchor });
      return;
    }
    const prefix = `${text.number} `;
    const start = anchor === 'middle' ? center - c.width(line, size) / 2 : left;
    out.push({ kind: 'text', at: { x: start, y }, text: text.number, role: 'number', anchor: 'start' });
    const rest = line.slice(prefix.length);
    if (rest)
      out.push({ kind: 'text', at: { x: start + c.width(prefix, size), y }, text: rest, role, anchor: 'start' });
  });
  if (text.mark) out.push({ kind: 'mark', id: text.mark, x: left + total - c.s.markW / 2, y: firstBaseline - textMid });
  return out;
}

/**
 * Duration of a sloped message in `{...}` below the middle of the arrow, on the side it comes from: there the
 * line runs higher than the text.
 */
export function durationText(text: string, x1: number, y1: number, x2: number, y2: number, c: SeqCtx): SeqShape[] {
  const t = `{${text}}`;
  const w = c.width(t, c.s.messageSize);
  const [mx, my] = [(x1 + x2) / 2, (y1 + y2) / 2];
  const { knockout, descent } = c.s;
  const left = x1 <= x2 ? mx - knockout - w : mx + knockout;
  const baseline = my + c.s.lineH + 1;
  return [
    {
      kind: 'rect',
      rect: { x: left - knockout, y: baseline - c.s.lineH + descent, w: w + 2 * knockout, h: c.s.lineH },
      role: 'knockout',
    },
    { kind: 'text', at: { x: left, y: baseline }, text: t, role: 'constraint', anchor: 'start' },
  ];
}
