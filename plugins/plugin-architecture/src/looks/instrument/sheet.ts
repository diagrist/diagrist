import { type Font, textWidth } from '@diagrist/core';
import { type Decision, MARGIN } from '@diagrist/parts';
import type { EdgeKind } from '../../grammar/edges.js';
import type { Metrics } from '../../layout/metrics.js';
import { type Tag, type TagTone, tagAt } from './tags.js';

/** A line of prose beside the picture, with the role that paints it and the font role it was measured with. */
export interface SheetText {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly role: 'sheetText' | 'sheetChoice' | 'sheetNote' | 'legendText';
  readonly font: 'note' | 'choice' | 'badge';
}

/** A short line of an edge's kind in the legend, from x1 to x2 on its row. */
export interface LineSample {
  readonly kind: EdgeKind;
  readonly x1: number;
  readonly x2: number;
  readonly y: number;
}

/** What `look=instrument` sets around the picture: the decisions in a column at the right, the legend in a row below. */
export interface InstrumentSheet {
  readonly tags: readonly Tag[];
  readonly texts: readonly SheetText[];
  readonly samples: readonly LineSample[];
  readonly width: number;
  readonly height: number;
}

/** A tag of the legend: its text and tone. */
export interface LegendTag {
  readonly text: string;
  readonly tone: TagTone;
}

/** What the sheet is set around, and the fonts of its prose. */
export interface SheetInput {
  readonly decisions: readonly Decision[];
  readonly tags: readonly LegendTag[];
  readonly lines: readonly { readonly kind: EdgeKind; readonly text: string }[];
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly open: (who: string) => string;
  readonly choice: Font;
}

const COLUMN = { gap: 56, width: 232, indent: 34, line: 15, after: 22 } as const;
const LEGEND = { gap: 48, row: 26, between: 8, apart: 24, sample: 28, sampleDx: 8, after: 36 } as const;

/** Words of `text` in lines no wider than `width`; a word wider than that stands alone. */
function wrap(text: string, width: number, font: Font): string[] {
  const lines: string[] = [];
  for (const word of text.split(' ')) {
    const last = lines.at(-1);
    if (last !== undefined && textWidth(`${last} ${word}`, font) <= width) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

/** The decisions from `top` down at `x`: the id as an orange tag, the question, the choice, the consequence. */
function column(input: SheetInput, x: number, m: Metrics): { tags: Tag[]; texts: SheetText[]; bottom: number } {
  const tags: Tag[] = [];
  const texts: SheetText[] = [];
  let y = input.top + COLUMN.line;
  const set = (text: string, role: SheetText['role'], font: SheetText['font'], f: Font) => {
    for (const line of wrap(text, COLUMN.width - COLUMN.indent, f)) {
      texts.push({ x: x + COLUMN.indent, y, text: line, role, font });
      y += COLUMN.line;
    }
  };
  for (const d of input.decisions) {
    tags.push(tagAt(d.id, { x, y }, m.fonts.badge, 'badge', 'signal'));
    set(d.question, 'sheetText', 'note', m.fonts.note);
    set(d.choice, 'sheetChoice', 'choice', input.choice);
    if (d.consequence) set(d.consequence, 'sheetNote', 'note', m.fonts.note);
    if (d.open) set(input.open(d.open), 'sheetNote', 'note', m.fonts.note);
    y += COLUMN.after - COLUMN.line;
  }
  return { tags, texts, bottom: y };
}

/** The legend in rows from `top`: the tags first, then each kind of line with its meaning in mono. */
function legendRow(input: SheetInput, top: number, width: number, m: Metrics) {
  const tags: Tag[] = [];
  const texts: SheetText[] = [];
  const samples: LineSample[] = [];
  let x = MARGIN;
  let y = top;
  const room = (w: number) => {
    if (x > MARGIN && x + w > width - MARGIN) {
      x = MARGIN;
      y += LEGEND.row;
    }
  };
  for (const t of input.tags) {
    room(tagAt(t.text, { x, y }, m.fonts.label, 'label', t.tone).rect.w);
    const tag = tagAt(t.text, { x, y }, m.fonts.label, 'label', t.tone);
    tags.push(tag);
    x += tag.rect.w + LEGEND.between;
  }
  if (input.tags.length > 0) x += LEGEND.apart - LEGEND.between;
  for (const l of input.lines) {
    const text = l.text.toUpperCase();
    const w = LEGEND.sample + LEGEND.sampleDx + textWidth(text, m.fonts.badge);
    room(w);
    samples.push({ kind: l.kind, x1: x, x2: x + LEGEND.sample, y: y - 3.5 });
    texts.push({ x: x + LEGEND.sample + LEGEND.sampleDx, y, text, role: 'legendText', font: 'badge' });
    x += w + LEGEND.apart;
  }
  const used = tags.length + samples.length > 0;
  return { tags, texts, samples, bottom: used ? y : top - LEGEND.gap };
}

/**
 * The sheet of `look=instrument`: decisions in a column right of everything drawn, their ids in orange tags as at
 * their boxes; below the picture the legend as one row of tags and line patterns, wrapped to the width.
 */
export function instrumentSheet(input: SheetInput, m: Metrics): InstrumentSheet {
  const x = input.right + COLUMN.gap;
  const notes = input.decisions.length > 0 ? column(input, x, m) : { tags: [], texts: [], bottom: 0 };
  const width = Math.max(input.width, notes.tags.length > 0 ? x + COLUMN.width + MARGIN : 0);
  const legend = legendRow(input, Math.max(input.bottom, notes.bottom) + LEGEND.gap, width, m);
  return {
    tags: [...notes.tags, ...legend.tags],
    texts: [...notes.texts, ...legend.texts],
    samples: legend.samples,
    width,
    height: legend.bottom + LEGEND.after,
  };
}
