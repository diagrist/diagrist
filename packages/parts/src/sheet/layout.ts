import type { Font, Shape } from '@diagrist/core';
import type { Decision } from '../decisions/adr.js';
import { decisionNotes, decisionRow } from '../decisions/notes.js';
import { sentenceLegend } from '../legend/sentence.js';
import { MARGIN } from './header.js';
import type { Hairline, SheetText } from './texts.js';

/** Where the content of a picture lies, and what the sheet sets around it. */
export interface SheetInput {
  /** Top of the content, where the first margin note starts. */
  readonly top: number;
  /** Right edge of everything drawn; the margin column starts a gap right of it. */
  readonly right: number;
  /** Lower edge of the content; the legend sentences start a gap below it or below the last note. */
  readonly bottom: number;
  /** Width of the picture without the margin column. */
  readonly width: number;
  /** Room below the content when no sentence is written. */
  readonly margin: number;
  /** The decisions to set as margin notes; none leaves the column out. */
  readonly decisions: readonly Decision[];
  /** Where the notes stand: in a column right of the content, the default, or side by side below it. */
  readonly notes?: 'right' | 'below';
  /** Who still decides an open question, phrased in the picture's language. */
  readonly open: (who: string) => string;
  /** The legend as sentences, each ending in its full stop; none leaves the legend out. */
  readonly sentences: readonly string[];
  /** The font notes and sentences are measured in, the one the caller's `label` font role sets. */
  readonly font: Font;
}

/** The sheet around a picture: hairlines and texts of margin notes and legend, and the size of the whole. */
export interface Sheet {
  readonly rules: readonly Hairline[];
  readonly texts: readonly SheetText[];
  readonly width: number;
  readonly height: number;
}

/** Gap above the legend sentences, and room below the last of them. */
const BELOW = { gap: 40, after: 32 } as const;

/** The notes of the decisions where `notes` puts them, or none. */
function notesOf(input: SheetInput) {
  const { decisions, font, open } = input;
  if (decisions.length === 0) return undefined;
  if (input.notes !== 'below') return decisionNotes(decisions, { right: input.right, top: input.top }, font, open);
  const at = { left: MARGIN, top: input.bottom + BELOW.gap, width: input.width - 2 * MARGIN };
  return decisionRow(decisions, at, font, open);
}

/**
 * The sheet: decisions as notes in a column right of everything drawn, which widens the picture, or side by side
 * below the content, and below content and notes a hairline over the full width with the legend as sentences. The
 * height ends below the last sentence, or `margin` below the content without sentences.
 */
export function sheetOf(input: SheetInput): Sheet {
  const { font } = input;
  const notes = notesOf(input);
  const width = Math.max(input.width, notes ? notes.right + MARGIN : 0);
  const ruleY = Math.max(input.bottom, notes?.bottom ?? 0) + BELOW.gap;
  const legend = sentenceLegend(input.sentences, ruleY, width, font);
  const last = legend.texts.at(-1)?.y ?? ruleY - BELOW.gap + input.margin;
  return {
    rules: [...(notes?.rules ?? []), ...legend.rules],
    texts: [...(notes?.texts ?? []), ...legend.texts],
    width,
    height: last + BELOW.after,
  };
}

/**
 * Hairlines and texts of the sheet, every text in the `label` font role. Roles `marginRule`, `marginId`,
 * `marginText`, `marginChoice` and `legendText` are styled by `PART_ROLES`.
 */
export const sheetShapes = (sheet: Sheet): Shape[] => [
  ...sheet.rules.map((r): Shape => ({ kind: 'line', ...r, role: 'marginRule' })),
  ...sheet.texts.map((t): Shape => ({ kind: 'text', x: t.x, y: t.y, text: t.text, role: t.role, font: 'label' })),
];
