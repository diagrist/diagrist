import { textWidth } from '@diagrist/core';
import { isKnown } from '../diagram.js';
import type { UseCaseModel } from '../model.js';
import { commentLines, NOTE_LINE } from './comment.js';
import { UC, UC_FONTS } from './metrics.js';

const FONT = UC_FONTS.label;

/** Words into lines of at most `width` characters; a longer word stands alone. */
export function wrapNote(text: string, width: number = UC.noteWrap): string[] {
  const out: string[] = [];
  for (const word of text.trim().split(/\s+/)) {
    const last = out.at(-1);
    if (last !== undefined && last.length + 1 + word.length <= width) out[out.length - 1] = `${last} ${word}`;
    else out.push(word);
  }
  return out;
}

/** What a note hangs on: an actor or use case, a subject, or the line of the relation at `relation`. */
export type NoteOn =
  | { readonly kind: 'node'; readonly id: string }
  | { readonly kind: 'subject'; readonly id: string }
  | { readonly kind: 'line'; readonly relation: number };

/** A note measured as a box: its id in the layout graph, its lines and what it hangs on. */
export interface NoteBox {
  readonly id: string;
  readonly texts: readonly string[];
  readonly width: number;
  readonly height: number;
  readonly on: NoteOn;
}

const boxed = (id: string, texts: readonly string[], on: NoteOn): NoteBox => ({
  id,
  texts,
  width: Math.ceil(Math.max(...texts.map((t) => textWidth(t, FONT))) + 2 * UC.notePad + UC.noteFold),
  height: texts.length * NOTE_LINE + 2 * UC.notePad,
  on,
});

/**
 * Every note of the picture as a box: first the note of every extend with a condition or extension points, then the
 * notes on elements; a note beside an actor wraps earlier, since the column of actors is narrow.
 */
export function noteBoxes(m: UseCaseModel): NoteBox[] {
  const lines = m.diagram.relations.flatMap((r, i) => {
    const texts = isKnown(r) ? commentLines(r) : [];
    return texts.length ? [boxed(`extend:${i}`, texts, { kind: 'line', relation: i })] : [];
  });
  const notes = m.diagram.notes.flatMap((n, i) => {
    if (n.on === undefined) return [];
    const on: NoteOn = m.subjects.has(n.on) ? { kind: 'subject', id: n.on } : { kind: 'node', id: n.on };
    if (on.kind === 'node' && !m.actors.has(n.on) && !m.cases.has(n.on)) return [];
    return [boxed(`note:${i}`, wrapNote(n.text, m.actors.has(n.on) ? UC.wrap : UC.noteWrap), on)];
  });
  return [...lines, ...notes];
}

/**
 * Where room for a note is kept: beside its anchor, in its layer and its subject. A note on a use case keeps it in
 * its subject, the note of an extend beside the extending use case; a note on a subject beside its use case in its
 * last column, outside every frame.
 */
export function noteHome(
  m: UseCaseModel,
  n: NoteBox,
  layer: ReadonlyMap<string, number>,
): { readonly anchor: string; readonly subject?: string } {
  if (n.on.kind === 'node') {
    const subject = m.cases.get(n.on.id)?.subject;
    return { anchor: n.on.id, ...(subject === undefined ? {} : { subject }) };
  }
  if (n.on.kind === 'line') {
    const r = m.diagram.relations[n.on.relation];
    const [a, b] = [m.cases.get(r?.from ?? ''), m.cases.get(r?.to ?? '')];
    const subject = a?.subject !== undefined && a.subject === b?.subject ? { subject: a.subject } : {};
    return { anchor: r?.from ?? '', ...subject };
  }
  const id = n.on.id;
  const own = m.diagram.cases.filter((u) => u.subject === id);
  const last = own.reduce<string | undefined>(
    (a, b) => (a === undefined || (layer.get(b.id) ?? 0) > (layer.get(a) ?? 0) ? b.id : a),
    undefined,
  );
  return { anchor: last ?? '' };
}
