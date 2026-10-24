import type { Rect } from '@diagrist/core';
import type { Decision } from '@diagrist/parts';
import type { Metrics } from '../../layout/metrics.js';
import type { ArchEdge, ArchitectureModel } from '../../model/types.js';
import type { Focus } from './focus.js';
import { BAND, LABEL_FONT } from './metrics.js';
import { type SheetText, wrap } from './text.js';
import type { ColumnsWords } from './words.js';

/** A flow number or a decision mark the side column draws before its text. */
export interface PanelSign {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly kind: 'step' | 'stepContext' | 'mark';
}

/** The side column: a head band per section, numbered steps, decisions with their marks. */
export interface Panel {
  readonly bands: readonly Rect[];
  readonly texts: readonly SheetText[];
  readonly signs: readonly PanelSign[];
  readonly bottom: number;
}

/** What the side column lists, and where it begins. */
export interface PanelInput {
  readonly model: ArchitectureModel;
  readonly focus: Focus;
  readonly words: ColumnsWords;
  readonly open: (who: string) => string;
  readonly x: number;
  readonly y: number;
}

/** Steps are listed beside the picture only when there are more than this many. */
const STEPS_LISTED = 3;
/** Width of the column, indent of texts after their sign, line height and room after an entry and a section. */
const COLUMN = { w: 264, indent: 44, line: 16, after: 10, section: 32, first: 30 } as const;

function stepText(e: ArchEdge, model: ArchitectureModel): string {
  const name = (id: string) =>
    model.nodes.find((n) => n.id === id)?.label ?? model.groups.find((g) => g.id === id)?.title ?? id;
  return e.label ?? `${name(e.from)} → ${name(e.to)}`;
}

/**
 * The side column of `look=columns` from (`x`, `y`) down: the steps of all flows when there are more than three,
 * then the decisions, each section under a head band like the columns.
 */
export function panelOf(input: PanelInput, m: Metrics): Panel {
  const { model, words, x } = input;
  const bands: Rect[] = [];
  const texts: SheetText[] = [];
  const signs: PanelSign[] = [];
  let y = input.y;
  const textX = x + COLUMN.indent;
  const width = COLUMN.w - COLUMN.indent - BAND.pad / 2;
  const head = (title: string, subtitle: string) => {
    bands.push({ x, y, w: COLUMN.w, h: BAND.h });
    texts.push({ x: x + BAND.pad, y: y + 26, text: title, role: 'bandTitle', font: 'title' });
    texts.push({ x: x + BAND.pad, y: y + 46, text: subtitle, role: 'bandSubtitle', font: 'title' });
    y += BAND.h + COLUMN.first;
  };
  const lines = (text: string, role: string, font: 'note' | 'label') => {
    for (const line of wrap(text, width, font === 'label' ? LABEL_FONT : m.fonts.note)) {
      texts.push({ x: textX, y, text: line, role, font });
      y += COLUMN.line;
    }
  };
  const steps = model.edges.filter((e) => e.step !== undefined).sort((a, b) => (a.step?.n ?? 0) - (b.step?.n ?? 0));
  if (steps.length > STEPS_LISTED) {
    head(words.steps, words.stepCount(steps.length));
    for (const e of steps) {
      const context = input.focus.edge(e);
      signs.push({ text: String(e.step?.n), x: x + BAND.pad + 8.5, y: y - 4, kind: context ? 'stepContext' : 'step' });
      lines(stepText(e, model), context ? 'panelContext' : 'panelText', 'note');
      y += COLUMN.after;
    }
    y += COLUMN.section - COLUMN.after;
  }
  const decisions: readonly Decision[] = model.decisions;
  if (decisions.length > 0) {
    head(words.decisions, words.decisionCount(decisions.length, decisions.filter((d) => d.open).length));
    for (const d of decisions) {
      signs.push({ text: d.id, x: x + BAND.pad + 12, y: y - 4, kind: 'mark' });
      lines(d.question, 'panelText', 'label');
      lines(d.choice, 'panelText', 'note');
      if (d.consequence) lines(d.consequence, 'panelMuted', 'note');
      if (d.open) lines(input.open(d.open), 'panelMuted', 'note');
      y += COLUMN.after;
    }
  }
  return { bands, texts, signs, bottom: y };
}

/** Width of the side column. */
export const PANEL_WIDTH = COLUMN.w;
