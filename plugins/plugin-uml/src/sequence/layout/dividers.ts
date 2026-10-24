import type { SequenceModel } from '../model/types.js';
import type { Rows } from './rows.js';
import type { SeqCtx } from './text.js';
import type { SeqShape } from './types.js';

export interface Dividers {
  /** Double lines, below the bars. */
  readonly lines: readonly SeqShape[];
  /** Text boxes, on top. */
  readonly boxes: readonly SeqShape[];
}

/** Width of the text box of a divider; the picture is at least this wide. */
export const dividerBoxWidth = (label: string, c: SeqCtx): number =>
  c.width(label, c.s.messageSize, true) + 2 * c.s.tagPadX;

/**
 * Dividers: a double line from `left` to `right` across all lifelines, the text centred in a box, like a new
 * section on the time axis.
 */
export function dividerArts(m: SequenceModel, rows: Rows, left: number, right: number, c: SeqCtx): Dividers {
  const s = c.s;
  const lines: SeqShape[] = [];
  const boxes: SeqShape[] = [];
  m.diagram.events.forEach((e, i) => {
    if (e.type !== 'divider') return;
    const y = rows.y[i] ?? 0;
    for (const dy of [-s.dividerGap / 2, s.dividerGap / 2])
      lines.push({ kind: 'line', seg: { x1: left, y1: y + dy, x2: right, y2: y + dy }, role: 'divider' });
    if (!e.label) return;
    const w = dividerBoxWidth(e.label, c);
    const cx = (left + right) / 2;
    boxes.push(
      { kind: 'rect', rect: { x: cx - w / 2, y: y - s.dividerH / 2, w, h: s.dividerH }, role: 'tag' },
      { kind: 'text', at: { x: cx, y: y + c.s.textMid }, text: e.label, role: 'tag', anchor: 'middle' },
    );
  });
  return { lines, boxes };
}
