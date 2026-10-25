import { type Font, textWidth } from '@diagrist/core';
import { type Decision, MARGIN } from '@diagrist/parts';
import type { Look } from '../looks/look.js';
import type { Segment } from './art.js';

/** A line of text of the sheet, with the role that paints it and the font role it was measured with. */
export interface SheetText {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly role: 'marginId' | 'marginText' | 'marginChoice' | 'legendText';
}

/**
 * What a look draws around the picture with `decisions: notes` or `legend: sentence`: decisions as notes in the right
 * margin, the legend as sentences below a hairline.
 */
export interface Sheet {
  readonly rules: readonly Segment[];
  readonly texts: readonly SheetText[];
  readonly width: number;
  readonly height: number;
}

/** Where the picture's content lies, and what goes around it. */
export interface SheetInput {
  readonly decisions: readonly Decision[];
  readonly sentences: readonly string[];
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  /** Who still decides an open question, phrased in the picture's language. */
  readonly open: (who: string) => string;
}

const COLUMN = { gap: 48, width: 216, indent: 24, line: 15, first: 18, after: 28 } as const;
const LEGEND = { gap: 40, first: 20, line: 16, after: 32 } as const;

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

/** The margin notes from `top` down at `x`: a hairline, the id in bold, question, choice, consequence, who decides. */
function marginNotes(
  input: SheetInput,
  x: number,
  font: Font,
): { rules: Segment[]; texts: SheetText[]; bottom: number } {
  const rules: Segment[] = [];
  const texts: SheetText[] = [];
  let y = input.top;
  for (const d of input.decisions) {
    rules.push({ x1: x, y1: y, x2: x + COLUMN.width, y2: y });
    y += COLUMN.first;
    texts.push({ x, y, text: d.id, role: 'marginId' });
    const parts: [string, SheetText['role']][] = [
      [d.question, 'marginText'],
      [d.choice, 'marginChoice'],
      ...(d.consequence ? [[d.consequence, 'marginText'] as [string, SheetText['role']]] : []),
      ...(d.open ? [[input.open(d.open), 'marginText'] as [string, SheetText['role']]] : []),
    ];
    for (const [text, role] of parts)
      for (const line of wrap(text, COLUMN.width - COLUMN.indent, font)) {
        texts.push({ x: x + COLUMN.indent, y, text: line, role });
        y += COLUMN.line;
      }
    y += COLUMN.after - COLUMN.line;
  }
  return { rules, texts, bottom: y };
}

/**
 * The sheet: decisions as notes in a column right of everything drawn, instead of a framed bar below; below the
 * picture a hairline over the full width and the legend as sentences, wrapped to that width.
 */
export function sheetOf(input: SheetInput, look: Look): Sheet {
  const font = look.fonts.label;
  const x = input.right + COLUMN.gap;
  const notes = input.decisions.length > 0 ? marginNotes(input, x, font) : { rules: [], texts: [], bottom: 0 };
  const width = Math.max(input.width, notes.rules.length > 0 ? x + COLUMN.width + MARGIN : 0);
  const ruleY = Math.max(input.bottom, notes.bottom) + LEGEND.gap;
  const lines = input.sentences.length > 0 ? wrap(input.sentences.join(' '), width - 2 * MARGIN, font) : [];
  const legend = lines.map(
    (text, i): SheetText => ({ x: MARGIN, y: ruleY + LEGEND.first + i * LEGEND.line, text, role: 'legendText' }),
  );
  const rules = lines.length > 0 ? [{ x1: MARGIN, y1: ruleY, x2: width - MARGIN, y2: ruleY }] : [];
  const last = legend.at(-1)?.y ?? ruleY - LEGEND.gap + look.metrics.margin;
  return {
    rules: [...notes.rules, ...rules],
    texts: [...notes.texts, ...legend],
    width,
    height: last + LEGEND.after,
  };
}
