import type { MessageEvent, SequenceEvent } from '../diagram.js';
import type { SequenceModel } from '../model/types.js';
import type { Columns } from './columns.js';
import { guardText, type Measured } from './text.js';
import type { SequenceTokens } from './tokens.js';

/** Room below the duration of a sloped message. */
const DURATION_GAP = 4;

/** Where the next row starts, and the height of the last arrow, which activations line up with. */
export interface Cursor {
  readonly at: number;
  readonly arrow: number | undefined;
}

/** What every row reads: the model, the measured texts and heads, and the heights of the rows above. */
export interface RowScope {
  readonly m: SequenceModel;
  readonly texts: readonly Measured[];
  readonly cols: Columns;
  /** Lifelines a message creates: index of that message. */
  readonly created: ReadonlyMap<string, number>;
  /** References with messages at their edge: their indices, and each by the index of its last message. */
  readonly runs: { readonly first: ReadonlySet<number>; readonly last: ReadonlyMap<number, number> };
  /** The heights of the rows placed so far, by event. */
  readonly y: readonly number[];
  readonly tokens: SequenceTokens;
}

/** One event placed: its height, where the next row starts, and the extras its kind of event adds. */
export interface Row {
  readonly y: number;
  readonly at: number;
  /** A new height for the last arrow. */
  readonly arrow?: number;
  readonly back?: number;
  readonly boxH?: number;
  readonly headEnd?: number;
  readonly arrive?: number;
  readonly closes?: ClosedRef;
}

/** A reference a message closes: its index and the height that reaches below the message. */
interface ClosedRef {
  readonly ref: number;
  readonly boxH: number;
}

/**
 * The row of one event below the cursor. The sums keep the predecessor's order of floating point steps, which the
 * byte-identical pictures depend on: a height is passed on as computed, never recomputed from its parts.
 */
export function rowOf(e: SequenceEvent, i: number, cursor: Cursor, scope: RowScope): Row {
  const t = scope.tokens;
  const at = cursor.at;
  switch (e.type) {
    case 'message':
      return e.from === e.to ? selfRow(e, i, at, scope) : messageRow(e, i, at, scope);
    case 'destroy':
      return below(at + t.rowGap / 2 + t.destroyR, t.destroyR);
    case 'fragment':
      return { y: at + t.framePadTop, at: at + t.framePadTop + t.tagH - t.rowGap / 3 };
    case 'operand':
      return below(at + t.operandGap, guardText(e) ? t.guardH : 0);
    case 'end':
      return below(at + (endsCoregion(i, scope) ? t.coregionGap : t.framePadBottom + gateRoom(i, scope)), 0);
    case 'coregion':
      return below(at + t.coregionGap, 0);
    case 'divider':
      return below(at + t.rowGap + t.dividerH / 2, t.dividerH / 2);
    case 'ref':
    case 'note':
    case 'invariant':
      return boxRow(e, i, at, scope);
    default:
      return { y: cursor.arrow ?? at, at };
  }
}

/** A row at `y` that the next one follows `rest` below. */
const below = (y: number, rest: number): Row => ({ y, at: y + rest });

/** Height of the label of a message or note: its lines, or one line for a mark alone. */
function labelHeight(i: number, scope: RowScope): number {
  const text = scope.texts[i] ?? { lines: [], w: 0 };
  return Math.max(text.lines.length, text.mark ? 1 : 0) * scope.tokens.lineH;
}

/** A message to its own lifeline: out at `y`, back at the end of its loop; a call keeps the bar open below. */
function selfRow(e: MessageEvent, i: number, at: number, scope: RowScope): Row {
  const t = scope.tokens;
  const out = at + t.rowGap + t.labelLift;
  const back = out + Math.max(t.selfH, labelHeight(i, scope) + t.labelLift);
  return { y: out, back, arrow: back, at: back + (e.kind === 'sync' ? t.barMinH - t.barOverhang : 0) };
}

/**
 * A message between two ends, below its label. A creation reaches down to the middle of the new head; a message
 * with a duration slopes and arrives lower. The last message at the edge of a reference closes it.
 */
function messageRow(e: MessageEvent, i: number, at: number, scope: RowScope): Row {
  const t = scope.tokens;
  const half = (scope.cols.size.get(e.to)?.h ?? 0) / 2;
  const creates = e.kind === 'create';
  const labelled = at + t.rowGap + labelHeight(i, scope) + t.labelLift;
  const y = creates && scope.created.get(e.to) === i ? Math.max(labelled, at + t.rowGap / 2 + half) : labelled;
  const reached = creates ? y + half : y;
  const closed = closedRef(i, reached, scope);
  const next = closed?.at ?? reached;
  const closes = closed === undefined ? {} : { closes: closed.closes };
  if (creates) return { y, arrow: y, at: next, headEnd: next, ...closes };
  if (!e.duration) return { y, arrow: y, at: next, ...closes };
  const arrive = y + t.slopeH;
  return { y, arrow: arrive, arrive, at: arrive + t.lineH / 2 + DURATION_GAP, ...closes };
}

/** The reference message `i` closes, grown to reach below `at`, and where the next row starts below it. */
function closedRef(i: number, at: number, scope: RowScope): { closes: ClosedRef; at: number } | undefined {
  const ref = scope.runs.last.get(i);
  if (ref === undefined) return undefined;
  const top = scope.y[ref] ?? at;
  const boxH = Math.max(scope.tokens.refH, at + scope.tokens.framePadBottom - top);
  return { closes: { ref, boxH }, at: top + boxH };
}

/** A reference, note or invariant: a box below the cursor; a reference with messages at its edge lets them in. */
function boxRow(
  e: SequenceEvent & { type: 'ref' | 'note' | 'invariant' },
  i: number,
  at: number,
  scope: RowScope,
): Row {
  const t = scope.tokens;
  const boxH =
    e.type === 'ref' ? t.refH : e.type === 'invariant' ? t.lineH + t.notePad : labelHeight(i, scope) + 2 * t.notePad;
  const y = at + t.framePadTop;
  return { y, boxH, at: y + (scope.runs.first.has(i) ? 0 : boxH) };
}

/** Whether the end at `i` closes a coregion rather than a fragment. */
const endsCoregion = (i: number, scope: RowScope): boolean => scope.m.coregions.some((region) => region.end === i);

/** Room for the name of a fragment gate at the message right before the end of its fragment. */
function gateRoom(i: number, scope: RowScope): number {
  const { m } = scope;
  const g = m.gates.get(i - 1);
  const f = g?.frame === undefined ? undefined : m.diagram.events[m.frameIds.get(g.frame) ?? -1];
  return g?.name && f?.type === 'fragment' ? scope.tokens.lineH / 2 : 0;
}
