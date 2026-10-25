import type { Font } from '@diagrist/core';
import type { Hairline, SheetText } from '../sheet/texts.js';
import { wrap } from '../text.js';
import type { Decision } from './adr.js';

/** The margin column: its gap to the content, its width, the indent of the texts and the steps between lines. */
const COLUMN = { gap: 48, width: 216, indent: 24, line: 15, first: 18, after: 28 } as const;

/** Decisions as notes in a column of the right margin, instead of cards in a bar below the picture. */
interface DecisionNotes {
  readonly rules: readonly Hairline[];
  readonly texts: readonly SheetText[];
  /** Right edge of the column, before the sheet's margin. */
  readonly right: number;
  /** Where the last note ends. */
  readonly bottom: number;
}

/** One note at (`x`, `y`): its hairline, the id, then its texts wrapped under it; where the next note may start. */
function noteAt(
  d: Decision,
  x: number,
  top: number,
  font: Font,
  open: (who: string) => string,
): { rule: Hairline; texts: SheetText[]; next: number } {
  let y = top;
  const rule = { x1: x, y1: y, x2: x + COLUMN.width, y2: y };
  y += COLUMN.first;
  const texts: SheetText[] = [{ x, y, text: d.id, role: 'marginId' }];
  const parts: [string, SheetText['role']][] = [
    [d.question, 'marginText'],
    [d.choice, 'marginChoice'],
    ...(d.consequence ? [[d.consequence, 'marginText'] as [string, SheetText['role']]] : []),
    ...(d.open ? [[open(d.open), 'marginText'] as [string, SheetText['role']]] : []),
  ];
  for (const [text, role] of parts)
    for (const line of wrap(text, COLUMN.width - COLUMN.indent, font)) {
      texts.push({ x: x + COLUMN.indent, y, text: line, role });
      y += COLUMN.line;
    }
  return { rule, texts, next: y + COLUMN.after - COLUMN.line };
}

/**
 * One note per decision in a column that starts `48` px right of `right`, from `top` down: a hairline, the id in
 * its own role, then question, choice, consequence and who still decides, each wrapped to the column in `font`
 * and indented under the id. `open` phrases who decides, in the picture's language.
 */
export function decisionNotes(
  decisions: readonly Decision[],
  at: { readonly right: number; readonly top: number },
  font: Font,
  open: (who: string) => string,
): DecisionNotes {
  const x = at.right + COLUMN.gap;
  const rules: Hairline[] = [];
  const texts: SheetText[] = [];
  let y = at.top;
  for (const d of decisions) {
    const note = noteAt(d, x, y, font, open);
    rules.push(note.rule);
    texts.push(...note.texts);
    y = note.next;
  }
  return { rules, texts, right: x + COLUMN.width, bottom: y };
}

/**
 * The same notes side by side below the picture instead, from `left` and `top`, as many in a row as fit into
 * `width` with the column's gap between them; each row starts below the longest note of the one before.
 */
export function decisionRow(
  decisions: readonly Decision[],
  at: { readonly left: number; readonly top: number; readonly width: number },
  font: Font,
  open: (who: string) => string,
): DecisionNotes {
  const step = COLUMN.width + COLUMN.gap;
  const perRow = Math.max(1, Math.floor((at.width + COLUMN.gap) / step));
  const rules: Hairline[] = [];
  const texts: SheetText[] = [];
  let top = at.top;
  let bottom = at.top;
  decisions.forEach((d, i) => {
    if (i > 0 && i % perRow === 0) top = bottom;
    const note = noteAt(d, at.left + (i % perRow) * step, top, font, open);
    rules.push(note.rule);
    texts.push(...note.texts);
    bottom = Math.max(bottom, note.next);
  });
  const used = Math.min(decisions.length, perRow);
  return { rules, texts, right: at.left + used * step - COLUMN.gap, bottom };
}
