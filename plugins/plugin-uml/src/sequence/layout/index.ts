/**
 * The layout of sequence diagrams keeps the predecessor's order of floating point steps, because its pictures are
 * compared byte for byte with the predecessor's (`docs/burn-down.md`, sequence Nr. 5). A value computed once is passed
 * on, never recomputed from its parts: the right edge of a note stays `right`, not `x + w`, and sums are not
 * regrouped, since `a + b + c` and `a + (b + c)` may differ in the last bit. A refactor here must keep every example's
 * hash in `test/__golden__/sequence-examples.sha256`.
 */
import { FONT_SIZE } from '@diagrist/core';
import { decisionStrip, HEADER, MARGIN, stripWidth, type Words } from '@diagrist/parts';
import type { SequenceModel } from '../model/types.js';
import { body, extent, lowest, type Parts } from './body.js';
import { columns, widenNotes } from './columns.js';
import { dividerArts, dividerBoxWidth } from './dividers.js';
import { rows } from './rows.js';
import { measureEvent, SEQ_CTX } from './text.js';
import type { SequenceLayout } from './types.js';

/** The texts of the picture the layout measures: the title line, and the suffix of open decisions. */
export type PictureTexts = Pick<Words, 'open'> & {
  /** Title line: kind and title, such as `Sequence diagram (UML) · Login`. */
  readonly title: string;
};

/**
 * Layout of a sequence diagram: lifelines are columns, events are rows. Columns grow with the measured labels,
 * the picture is shifted to the margin in a second pass, then sized to fit title, dividers and decision bar.
 */
export function layoutSequence(m: SequenceModel, words: PictureTexts): SequenceLayout {
  const c = SEQ_CTX;
  const numbers = new Map<number, number>();
  m.diagram.events.forEach((e, i) => {
    if (m.diagram.autonumber && e.type === 'message') numbers.set(i, numbers.size + 1);
  });
  const measured = m.diagram.events.map((e, i) => measureEvent(e, c, numbers.get(i)));
  const cols = columns(m, measured, c);
  const texts = widenNotes(m, measured, cols, c);
  const parts: Parts = { m, texts, cols, rows: rows(m, texts, cols, c), c };
  const [start] = extent(body(parts, 0));
  const placed = body(parts, Math.ceil(MARGIN - start));
  const [left, right] = extent(placed);
  const titleW = c.width(words.title, FONT_SIZE.title, true);
  const frameBottoms = placed.frames.flatMap((f) => (f.kind === 'rect' ? [f.rect.y + f.rect.h] : []));
  const bottom = Math.max(lowest(placed.lifelines), ...frameBottoms);
  const labels = m.diagram.events.flatMap((e) =>
    e.type === 'divider' && e.label ? [dividerBoxWidth(e.label, c)] : [],
  );
  const width = Math.ceil(
    Math.max(
      right + MARGIN,
      titleW + 2 * MARGIN,
      ...labels.map((w) => w + 2 * MARGIN),
      stripWidth(m.diagram.decisions, words.open),
    ),
  );
  const dividers = dividerArts(m, parts.rows, left, Math.max(right, width - MARGIN), c);
  const strip = decisionStrip(m.diagram.decisions, bottom, width);
  return {
    header: HEADER,
    width,
    height: Math.ceil((strip.cards.length > 0 ? strip.bottom : bottom) + MARGIN),
    ...placed,
    guides: [...placed.guides, ...dividers.lines],
    annotations: [...placed.annotations, ...dividers.boxes],
    strip,
  };
}
