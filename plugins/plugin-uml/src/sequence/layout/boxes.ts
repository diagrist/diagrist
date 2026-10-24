import type { Rect } from '@diagrist/core';
import type { SequenceModel } from '../model/types.js';
import type { Rows } from './rows.js';
import { boxWidth, type Measured, type SeqCtx, tagWidth } from './text.js';
import type { SeqShape } from './types.js';

export interface BoxArt {
  readonly index: number;
  readonly rect: Rect;
  readonly shapes: readonly SeqShape[];
}

/** Pentagon with the bottom right corner cut off, the operator inside. */
export function tagShapes(text: string, left: number, top: number, c: SeqCtx): SeqShape[] {
  const s = c.s;
  const w = tagWidth(text, c);
  return [
    {
      kind: 'path',
      d: `M${left} ${top} H${left + w} V${top + s.tagH - s.tagCut} L${left + w - s.tagCut} ${top + s.tagH} H${left} Z`,
      role: 'tag',
    },
    {
      kind: 'text',
      at: { x: left + s.tagPadX, y: top + s.tagH / 2 + s.textMid },
      text,
      role: 'tag',
      anchor: 'start',
    },
  ];
}

/** Horizontal extent over the named lifelines: centred on one, with overhang over several. */
function span(over: readonly string[], xs: ReadonlyMap<string, number>, w: number, c: SeqCtx): [number, number] {
  const at = over.map((id) => xs.get(id)).filter((x) => x !== undefined);
  const [a, b] = [Math.min(...at), Math.max(...at)];
  const left = a === b ? a - w / 2 : a - c.s.overhang;
  const right = a === b ? a + w / 2 : b + c.s.overhang;
  const grow = Math.max(0, w - (right - left)) / 2;
  return [left - grow, right + grow];
}

/**
 * State invariant on the lifeline (UML 2.5.1, 17.2.4): a condition `{...}` on a knocked-out ground, a state in
 * a rounded box.
 */
function invariant(rect: Rect, text: string, state: boolean, c: SeqCtx): SeqShape[] {
  const at = { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 + c.s.textMid };
  return [
    state ? { kind: 'rect', rect, role: 'state', rx: rect.h / 2 } : { kind: 'rect', rect, role: 'knockout' },
    { kind: 'text', at, text, role: state ? 'message' : 'constraint', anchor: 'middle' },
  ];
}

/** `right` is passed as computed, not as `x + w`, so its floating point value stays the same. */
function refShapes(label: string, rect: Rect, right: number, text: Measured, c: SeqCtx): SeqShape[] {
  const s = c.s;
  const [l, t, r] = [rect.x, rect.y, right];
  const x = Math.max((l + r) / 2, l + tagWidth('ref', c) + s.guardGap + text.w / 2);
  return [
    { kind: 'rect', rect, role: 'ref' },
    ...tagShapes('ref', l, t, c),
    {
      kind: 'text',
      at: { x, y: t + rect.h / 2 + s.tagH / 4 + s.descent },
      text: label,
      role: 'name',
      anchor: 'middle',
    },
  ];
}

function noteShapes(rect: Rect, right: number, text: Measured, c: SeqCtx): SeqShape[] {
  const s = c.s;
  const [l, t, r, b, f] = [rect.x, rect.y, right, rect.y + rect.h, s.noteFold];
  return [
    { kind: 'path', d: `M${l} ${t} H${r - f} L${r} ${t + f} V${b} H${l} Z`, role: 'note' },
    { kind: 'path', d: `M${r - f} ${t} V${t + f} H${r}`, role: 'note' },
    ...text.lines.map(
      (line, k): SeqShape => ({
        kind: 'text',
        at: { x: l + s.notePad, y: t + s.notePad + (k + 1) * s.lineH - s.descent },
        text: line,
        role: 'note',
        anchor: 'start',
      }),
    ),
  ];
}

/** References (`ref`) as frames with a tag, notes with a dog-ear; both cover the lifelines. */
export function boxArts(
  m: SequenceModel,
  rows: Rows,
  xs: ReadonlyMap<string, number>,
  texts: readonly Measured[],
  c: SeqCtx,
): BoxArt[] {
  const out: BoxArt[] = [];
  m.diagram.events.forEach((e, i) => {
    if (e.type !== 'ref' && e.type !== 'note' && e.type !== 'invariant') return;
    const text = texts[i] ?? { lines: [], w: 0 };
    const [l, r] = span(e.type === 'invariant' ? [e.on ?? ''] : e.over, xs, boxWidth(e, text, c), c);
    const rect: Rect = { x: l, y: rows.y[i] ?? 0, w: r - l, h: rows.boxH.get(i) ?? 0 };
    const shapes =
      e.type === 'invariant'
        ? invariant(rect, text.lines[0] ?? '', e.state === true, c)
        : e.type === 'ref'
          ? refShapes(e.label, rect, r, text, c)
          : noteShapes(rect, r, text, c);
    out.push({ index: i, rect, shapes });
  });
  return out;
}
