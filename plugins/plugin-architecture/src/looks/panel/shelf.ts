import { type Font, type Rect, textWidth } from '@diagrist/core';
import { type Decision, MARGIN } from '@diagrist/parts';
import type { Spot } from '../../layout/art.js';
import type { Metrics } from '../../layout/metrics.js';
import type { PanelEntry, PanelSample } from './legend.js';

/** A line of text on a card of the shelf, with the role that paints it and the font role it was measured with. */
export interface ShelfText extends Spot {
  readonly text: string;
  readonly role: 'legendTitle' | 'legendText' | 'decisionQuestion' | 'decisionChoice' | 'decisionNote';
  readonly font: 'group' | 'note' | 'name';
}

/** A card below the picture: the legend, or one decision with its mark; open decisions are drawn dashed. */
export interface ShelfCard {
  readonly rect: Rect;
  readonly role: 'legendCard' | 'decisionCard' | 'decisionCardOpen';
  readonly texts: readonly ShelfText[];
  readonly samples: readonly (Spot & { readonly sample: PanelSample })[];
  readonly mark?: Spot & { readonly id: string };
}

/** The cards below the picture and the size of the whole sheet. */
export interface PanelShelf {
  readonly cards: readonly ShelfCard[];
  readonly width: number;
  readonly height: number;
}

/** What goes on the shelf, and where the picture ends. */
export interface ShelfInput {
  readonly entries: readonly (readonly PanelEntry[])[];
  readonly decisions: readonly Decision[];
  readonly legend: string;
  readonly open: (who: string) => string;
  readonly bottom: number;
  readonly width: number;
}

const PAD = 16;
const GAP = { above: 40, between: 16, below: 32 } as const;
const LEGEND = { title: 27, first: 48, row: 22, text: 38, column: 32, rows: 6 } as const;
const DECISION = { width: 280, indent: 48, first: 28, line: 15, choice: 17, after: 6 } as const;

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

/** The columns of the legend, a column longer than the card's rows continued in the next. */
const chunked = (columns: readonly (readonly PanelEntry[])[]): PanelEntry[][] =>
  columns.flatMap((c) =>
    Array.from({ length: Math.ceil(c.length / LEGEND.rows) }, (_, k) =>
      c.slice(k * LEGEND.rows, (k + 1) * LEGEND.rows),
    ),
  );

/** The legend card at (0, 0): its title, then its columns side by side. */
function legendCard(entries: readonly (readonly PanelEntry[])[], title: string, m: Metrics): ShelfCard {
  const columns = chunked(entries);
  const rows = Math.max(...columns.map((c) => c.length));
  const placed = [];
  let x = PAD;
  for (const column of columns) {
    placed.push(...column.map((e, i) => ({ ...e, x, y: LEGEND.first + i * LEGEND.row })));
    x += LEGEND.text + Math.max(...column.map((e) => textWidth(e.text, m.fonts.note))) + LEGEND.column;
  }
  const w = Math.max(textWidth(title, m.fonts.group) + 2 * PAD, x - LEGEND.column + PAD);
  return {
    rect: { x: 0, y: 0, w, h: LEGEND.first + (rows - 1) * LEGEND.row + PAD + 2 },
    role: 'legendCard',
    texts: [
      { x: PAD, y: LEGEND.title, text: title, role: 'legendTitle', font: 'group' },
      ...placed.map(
        (p): ShelfText => ({ x: p.x + LEGEND.text, y: p.y + 4, text: p.text, role: 'legendText', font: 'note' }),
      ),
    ],
    samples: placed.map(({ sample, x, y }) => ({ sample, x, y })),
  };
}

/** A decision card at (0, 0): the mark, then question, choice, consequence and who still decides, wrapped. */
function decisionCard(d: Decision, open: (who: string) => string, m: Metrics): ShelfCard {
  const room = DECISION.width - DECISION.indent - PAD;
  const parts: (readonly [string, ShelfText['role'], 'note' | 'name', number])[] = [
    [d.question, 'decisionQuestion', 'note', DECISION.line],
    [d.choice, 'decisionChoice', 'name', DECISION.choice],
    ...(d.consequence ? [[d.consequence, 'decisionNote', 'note', DECISION.line] as const] : []),
    ...(d.open ? [[open(d.open), 'decisionNote', 'note', DECISION.line] as const] : []),
  ];
  const texts: ShelfText[] = [];
  let y = DECISION.first;
  for (const [text, role, font, line] of parts) {
    for (const piece of wrap(text, room, m.fonts[font])) {
      texts.push({ x: DECISION.indent, y, text: piece, role, font });
      y += line;
    }
    y += DECISION.after;
  }
  return {
    rect: { x: 0, y: 0, w: DECISION.width, h: y - DECISION.line - DECISION.after + PAD + 4 },
    role: d.open ? 'decisionCardOpen' : 'decisionCard',
    texts,
    samples: [],
    mark: { id: d.id, x: PAD + 12, y: DECISION.first - 4 },
  };
}

const moved = (card: ShelfCard, dx: number, dy: number, h: number): ShelfCard => ({
  ...card,
  rect: { x: card.rect.x + dx, y: card.rect.y + dy, w: card.rect.w, h },
  texts: card.texts.map((t) => ({ ...t, x: t.x + dx, y: t.y + dy })),
  samples: card.samples.map((s) => ({ ...s, x: s.x + dx, y: s.y + dy })),
  ...(card.mark ? { mark: { ...card.mark, x: card.mark.x + dx, y: card.mark.y + dy } } : {}),
});

/**
 * The shelf of `look=panel` below the picture: the legend as a card of its own, then one card per decision, side
 * by side from the left margin and on to a new row where the picture's width ends; cards of a row are equally high.
 */
export function panelShelf(input: ShelfInput, m: Metrics): PanelShelf {
  const cards = [
    ...(input.entries.length > 0 ? [legendCard(input.entries, input.legend, m)] : []),
    ...input.decisions.map((d) => decisionCard(d, input.open, m)),
  ];
  const width = Math.max(input.width, ...cards.map((c) => c.rect.w + 2 * MARGIN));
  const rows: ShelfCard[][] = [];
  let x = MARGIN;
  for (const card of cards) {
    const row = rows.at(-1);
    if (row && x + card.rect.w <= width - MARGIN) row.push(card);
    else {
      rows.push([card]);
      x = MARGIN;
    }
    x += card.rect.w + GAP.between;
  }
  const placed: ShelfCard[] = [];
  let top = input.bottom + GAP.above;
  for (const row of rows) {
    const h = Math.max(...row.map((c) => c.rect.h));
    let left = MARGIN;
    for (const card of row) {
      placed.push(moved(card, left, top, h));
      left += card.rect.w + GAP.between;
    }
    top += h + GAP.between;
  }
  const height = rows.length > 0 ? top - GAP.between + GAP.below : input.bottom + m.margin;
  return { cards: placed, width, height };
}
