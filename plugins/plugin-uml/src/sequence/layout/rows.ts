import { refRunEnd } from '../model/ref-run.js';
import type { SequenceModel } from '../model/types.js';
import type { Columns } from './columns.js';
import { type Cursor, type RowScope, rowOf } from './row.js';
import type { Measured, SeqCtx } from './text.js';

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

/**
 * Rows from top to bottom in source order. Every row is as high as its content: wrapped labels, loops, frame
 * tags, notes. Only the order is meaning; the heights are layout. A fold over the events: each places itself below
 * the cursor (`rowOf`) and says where the next one starts, and a message at the edge of a reference closes it.
 */
export function rows(m: SequenceModel, texts: readonly Measured[], cols: Columns, ctx: SeqCtx): Rows {
  const created = creations(m);
  const headBottom = headsBottom(m, cols, created, ctx);
  const y: number[] = [];
  const scope: RowScope = { m, texts, cols, created, y, runs: refRuns(m), tokens: ctx.s };
  const out = {
    y,
    back: new Map<number, number>(),
    boxH: new Map<number, number>(),
    headEnd: new Map<number, number>(),
    arrive: new Map<number, number>(),
  };
  let cursor: Cursor = { at: headBottom, arrow: undefined };
  m.diagram.events.forEach((event, i) => {
    const row = rowOf(event, i, cursor, scope);
    y.push(row.y);
    for (const key of ['back', 'boxH', 'headEnd', 'arrive'] as const) {
      const value = row[key];
      if (value !== undefined) out[key].set(i, value);
    }
    if (row.closes !== undefined) out.boxH.set(row.closes.ref, row.closes.boxH);
    cursor = { at: row.at, arrow: row.arrow ?? cursor.arrow };
  });
  return { headBottom, ...out, created, bottom: cursor.at };
}

/** Lifelines a message creates, each with the index of its first creating message. */
function creations(m: SequenceModel): Map<string, number> {
  const created = new Map<string, number>();
  m.diagram.events.forEach((e, i) => {
    if (e.type === 'message' && e.kind === 'create' && !created.has(e.to)) created.set(e.to, i);
  });
  return created;
}

/** Bottom of the first row of heads, below the tag of the frame around the interaction if there is one. */
function headsBottom(m: SequenceModel, cols: Columns, created: ReadonlyMap<string, number>, ctx: SeqCtx): number {
  const tokens = ctx.s;
  const first = m.order.filter((id) => !created.has(id)).map((id) => cols.size.get(id)?.h ?? 0);
  const framed = m.framed === undefined ? 0 : tokens.tagH + tokens.framePadTop / 2;
  return tokens.headTop + framed + Math.max(tokens.headH, ...first);
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
