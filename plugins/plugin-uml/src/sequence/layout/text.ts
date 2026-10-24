import { textWidth } from '@diagrist/core';
import { FONT_SIZE } from '../../theme.js';
import type { FragmentEvent, Participant, SequenceEvent } from '../diagram.js';
import { SEQUENCE_TOKENS, type SequenceTokens } from './tokens.js';

/** What the parts of the sequence layout share: measures, font sizes, measuring. */
export interface SeqCtx {
  readonly s: SequenceTokens;
  readonly nameSize: number;
  readonly stereoSize: number;
  readonly noteSize: number;
  width(text: string, size: number, bold?: boolean): number;
}

/** Measures, font sizes and text measuring of every sequence picture. */
export const SEQ_CTX: SeqCtx = {
  s: SEQUENCE_TOKENS,
  nameSize: FONT_SIZE.node,
  stereoSize: FONT_SIZE.note,
  noteSize: FONT_SIZE.note,
  width: (text, size, bold) => textWidth(text, { size, weight: bold ? 600 : 400 }),
};

/** The guard UML shows for an `else` without one; a keyword of the notation, the same in every locale. */
const ELSE = '[else]';

/** A measured text, wrapped if needed; `number` leads its first line, `mark` follows the text. */
export interface Measured {
  readonly lines: readonly string[];
  readonly w: number;
  readonly number?: string;
  readonly mark?: string;
}

/** Width of a label including its decision mark. */
export const labelWidth = (text: Measured, c: SeqCtx): number =>
  text.w + (text.mark ? (text.w > 0 ? c.s.markGap : 0) + c.s.markW : 0);

/** Wraps at spaces as soon as a line would get wider than `max`. */
export function wrap(text: string, max: number, size: number, c: SeqCtx): Measured {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(' ')) {
    const next = current ? `${current} ${word}` : word;
    if (current && c.width(next, size) > max) {
      lines.push(current);
      current = word;
    } else current = next;
  }
  if (current || lines.length === 0) lines.push(current);
  return { lines, w: Math.max(...lines.map((l) => c.width(l, size))) };
}

/** `ignore` and `consider` list messages instead of a guard (UML 2.5.1, 17.6.3). */
const listed = (e: FragmentEvent): boolean => e.operator === 'ignore' || e.operator === 'consider';

/** Text in the tag of a fragment: the operator, for `ignore`/`consider` with the messages in `{...}`. */
export const fragmentTag = (e: FragmentEvent): string =>
  listed(e) && e.guard ? `${e.operator} {${e.guard}}` : e.operator;

/** Guard in square brackets; an `else` without one shows `[else]`. */
export function guardText(event: SequenceEvent): string | undefined {
  if (event.type !== 'fragment' && event.type !== 'operand') return undefined;
  if (event.type === 'fragment' && listed(event)) return undefined;
  if (event.guard) return `[${event.guard}]`;
  return event.type === 'operand' && event.operator === 'else' ? ELSE : undefined;
}

/** Guard of an operand after the first: its own, `[else]` for `else`, nothing for `and`. */
export const operandGuard = (guard: string | undefined, marker: string): string =>
  guard ? `[${guard}]` : marker === 'else' ? ELSE : '';

/** A message with its number (`autonumber`) and mark; the number never wraps alone. */
function messageText(label: string | undefined, number: number | undefined, mark: string | undefined, c: SeqCtx) {
  const s = c.s;
  const text = [number, label].filter((x) => x !== undefined).join(' ');
  const wrapped = text ? wrap(text, s.labelMaxW, s.messageSize, c) : { lines: [], w: 0 };
  return {
    ...wrapped,
    ...(number !== undefined ? { number: String(number) } : {}),
    ...(mark ? { mark } : {}),
  };
}

/** Texts per event: message, note, reference, invariant. Other events have no text that wraps. */
export function measureEvent(event: SequenceEvent, c: SeqCtx, number?: number): Measured {
  const s = c.s;
  if (event.type === 'message') return messageText(event.label, number, event.mark, c);
  if (event.type === 'note') return wrap(event.text, s.noteMaxW, c.noteSize, c);
  if (event.type === 'ref') return { lines: [event.label], w: c.width(event.label, s.messageSize, true) };
  if (event.type === 'invariant') {
    const text = event.state ? event.text : `{${event.text}}`;
    return { lines: [text], w: c.width(text, s.messageSize) };
  }
  return { lines: [], w: 0 };
}

/** Width of the tag with the operator (`alt`, `ref`). */
export const tagWidth = (operator: string, c: SeqCtx): number =>
  c.width(operator, c.s.messageSize, true) + 2 * c.s.tagPadX + c.s.tagCut;

/** Width of a reference or note before it is laid over its lifelines. */
export function boxWidth(event: SequenceEvent, text: Measured, c: SeqCtx): number {
  const s = c.s;
  if (event.type === 'ref') return tagWidth('ref', c) + text.w + 2 * s.tagPadX + 2 * s.guardGap;
  if (event.type === 'invariant') return text.w + 2 * s.notePad;
  return text.w + 2 * s.notePad + s.noteFold;
}

/** Figure heads carry their name below the symbol, all others inside the box. */
export const isFigure = (p: Participant): boolean =>
  p.kind === 'actor' || p.kind === 'boundary' || p.kind === 'control' || p.kind === 'entity';

/** Width and height of a head from name and stereotype. */
export function headSize(p: Participant, c: SeqCtx): { readonly w: number; readonly h: number } {
  const s = c.s;
  const name = c.width(p.label, c.nameSize, true);
  const stereo = p.stereotype ? c.width(`«${p.stereotype}»`, c.stereoSize) : 0;
  const text = Math.max(name, stereo);
  const extra = p.stereotype ? s.stereoH : 0;
  if (isFigure(p)) return { w: Math.max(s.figureH, text), h: s.figureH + s.lineH + extra + s.labelLift };
  const caps = p.kind === 'queue' ? 2 * s.symbolR : 0;
  return { w: Math.max(s.headMinW, text + 2 * s.headPadX + caps), h: s.headH + extra };
}
