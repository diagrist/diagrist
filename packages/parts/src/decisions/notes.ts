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
    rules.push({ x1: x, y1: y, x2: x + COLUMN.width, y2: y });
    y += COLUMN.first;
    texts.push({ x, y, text: d.id, role: 'marginId' });
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
    y += COLUMN.after - COLUMN.line;
  }
  return { rules, texts, right: x + COLUMN.width, bottom: y };
}
