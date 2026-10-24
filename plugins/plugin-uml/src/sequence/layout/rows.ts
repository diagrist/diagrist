import type { SequenceEvent } from '../diagram.js';
import { refRunEnd } from '../model/ref-run.js';
import type { SequenceModel } from '../model/types.js';
import type { Columns } from './columns.js';
import { guardText, type Measured, type SeqCtx } from './text.js';

/** Room below the duration of a sloped message. */
const DURATION_GAP = 4;

export interface Rows {
  /** Bottom of the heads in the first row; the lifelines start there. */
  readonly headBottom: number;
  /** Per event: height of the arrow, top of frame, reference and note, divider, bottom at an end marker. */
  readonly y: readonly number[];
  /** Self call: height where the loop comes back. */
  readonly back: ReadonlyMap<number, number>;
  /** Height of references and notes. */
  readonly boxH: ReadonlyMap<number, number>;
  /** Lifelines a message creates: index of that message. */
  readonly created: ReadonlyMap<string, number>;
  /** Creation: bottom of the new head, where the constructor bar starts. */
  readonly headEnd: ReadonlyMap<number, number>;
  /** Message with a duration: height where the sloped arrow arrives at the receiver. */
  readonly arrive: ReadonlyMap<number, number>;
  readonly bottom: number;
}

interface Cursor {
  at: number;
  arrow: number | undefined;
}

/**
 * Rows from top to bottom in source order. Every row is as high as its content: wrapped labels, loops, frame
 * tags, notes. Only the order is meaning; the heights are layout.
 */
export function rows(m: SequenceModel, texts: readonly Measured[], cols: Columns, c: SeqCtx): Rows {
  const s = c.s;
  const created = new Map<string, number>();
  m.diagram.events.forEach((e, i) => {
    if (e.type === 'message' && e.kind === 'create' && !created.has(e.to)) created.set(e.to, i);
  });
  const first = m.order.filter((id) => !created.has(id)).map((id) => cols.size.get(id)?.h ?? 0);
  const framed = m.framed === undefined ? 0 : s.tagH + s.framePadTop / 2;
  const headBottom = s.headTop + framed + Math.max(s.headH, ...first);
  const out = {
    y: [] as number[],
    back: new Map<number, number>(),
    boxH: new Map<number, number>(),
    headEnd: new Map<number, number>(),
    arrive: new Map<number, number>(),
  };
  const cursor: Cursor = { at: headBottom, arrow: undefined };
  const runs = refRuns(m);
  const regionEnds = new Set(m.coregions.flatMap((r) => (r.end === undefined ? [] : [r.end])));
  const { y, boxH } = out;
  /** The last message at the edge of a reference closes it: the reference reaches below it. */
  const closeRef = (i: number) => {
    const k = runs.last.get(i);
    if (k === undefined) return;
    const top = y[k] ?? cursor.at;
    boxH.set(k, Math.max(s.refH, cursor.at + s.framePadBottom - top));
    cursor.at = top + (boxH.get(k) ?? 0);
  };
  const place = (e: SequenceEvent, i: number): void => {
    const text = texts[i] ?? { lines: [], w: 0 };
    const labelH = Math.max(text.lines.length, text.mark ? 1 : 0) * s.lineH;
    switch (e.type) {
      case 'message': {
        const top = cursor.at + s.rowGap;
        if (e.from === e.to) {
          const outY = top + s.labelLift;
          const ret = outY + Math.max(s.selfH, labelH + s.labelLift);
          y.push(outY);
          out.back.set(i, ret);
          cursor.arrow = ret;
          cursor.at = ret + (e.kind === 'sync' ? s.barMinH - s.barOverhang : 0);
          return;
        }
        let at = top + labelH + s.labelLift;
        if (e.kind === 'create' && created.get(e.to) === i)
          at = Math.max(at, cursor.at + s.rowGap / 2 + (cols.size.get(e.to)?.h ?? 0) / 2);
        y.push(at);
        cursor.arrow = at;
        cursor.at = e.kind === 'create' ? at + (cols.size.get(e.to)?.h ?? 0) / 2 : at;
        closeRef(i);
        if (e.duration && e.kind !== 'create') {
          out.arrive.set(i, at + s.slopeH);
          cursor.arrow = at + s.slopeH;
          cursor.at = cursor.arrow + s.lineH / 2 + DURATION_GAP;
        }
        if (e.kind === 'create') out.headEnd.set(i, cursor.at);
        return;
      }
      case 'destroy':
        y.push(cursor.at + s.rowGap / 2 + s.destroyR);
        cursor.at = (y[i] ?? cursor.at) + s.destroyR;
        return;
      case 'fragment':
        y.push(cursor.at + s.framePadTop);
        cursor.at = (y[i] ?? cursor.at) + s.tagH - s.rowGap / 3;
        return;
      case 'operand':
        y.push(cursor.at + s.operandGap);
        cursor.at = (y[i] ?? cursor.at) + (guardText(e) ? s.guardH : 0);
        return;
      case 'end':
        y.push(cursor.at + (regionEnds.has(i) ? s.coregionGap : s.framePadBottom + namedGateAbove(m, i, s.lineH / 2)));
        cursor.at = y[i] ?? cursor.at;
        return;
      case 'coregion':
        y.push(cursor.at + s.coregionGap);
        cursor.at = y[i] ?? cursor.at;
        return;
      case 'divider':
        y.push(cursor.at + s.rowGap + s.dividerH / 2);
        cursor.at = (y[i] ?? cursor.at) + s.dividerH / 2;
        return;
      case 'ref':
      case 'note':
      case 'invariant': {
        const h = e.type === 'ref' ? s.refH : e.type === 'invariant' ? s.lineH + s.notePad : labelH + 2 * s.notePad;
        y.push(cursor.at + s.framePadTop);
        boxH.set(i, h);
        cursor.at = (y[i] ?? cursor.at) + (runs.first.has(i) ? 0 : h);
        return;
      }
      default:
        y.push(cursor.arrow ?? cursor.at);
    }
  };
  m.diagram.events.forEach(place);
  return { headBottom, ...out, created, bottom: cursor.at };
}

/** References with messages at their edge (also later ones, with events beside): start and last message. */
function refRuns(m: SequenceModel): { first: Set<number>; last: Map<number, number> } {
  const first = new Set<number>();
  const last = new Map<number, number>();
  const parts = { events: m.diagram.events, gates: m.gates, order: m.order };
  m.diagram.events.forEach((e, k) => {
    if (e.type !== 'ref' || !e.id) return;
    const j = refRunEnd(k, e.id, e.over, parts);
    if (j === undefined) return;
    first.add(k);
    last.set(j, k);
  });
  return { first, last };
}

/** Room for the name of a formal gate at the message right before the end of its fragment. */
function namedGateAbove(m: SequenceModel, i: number, room: number): number {
  const g = m.gates.get(i - 1);
  const f = g?.frame === undefined ? undefined : m.diagram.events[m.frameIds.get(g.frame) ?? -1];
  return g?.name && f?.type === 'fragment' ? room : 0;
}
