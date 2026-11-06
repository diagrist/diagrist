import { type Placed, textWidth } from '@diagrist/core';
import type { EdgeLabel, GridLayout, GridSpec, Route } from '@diagrist/layout-grid';
import { decisionStrip, HEADER, type Header, MARGIN, type Strip, stripWidth, type Words } from '@diagrist/parts';
import type { UseCaseModel } from '../model.js';
import type { Comment } from './art.js';
import { arrangeUseCase } from './auto/index.js';
import { captionBoxes, type Drawn, drawnOf } from './drawn.js';
import { UC_FONTS, UC_GRID } from './metrics.js';
import { placedAll } from './placed.js';
import { priceOf } from './price.js';

/** The texts of the picture the layout measures: the title line, and the suffix of open decisions. */
export type PictureTexts = Pick<Words, 'open'> & {
  /** Title line: kind and title, such as `Use case diagram (UML) · Shop`. */
  readonly title: string;
};

/** A decision mark beside an actor or use case. */
export interface MarkSpot {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

/** Everything the scene draws, in picture pixels. */
export interface UseCaseLayout {
  readonly header: Header;
  readonly width: number;
  readonly height: number;
  readonly spec: GridSpec;
  readonly grid: GridLayout;
  readonly routes: readonly Route[];
  readonly drawn: readonly Drawn[];
  readonly labels: readonly EdgeLabel[];
  readonly comments: readonly Comment[];
  readonly marks: readonly MarkSpot[];
  readonly strip: Strip;
  /** What was placed, for the kernel's placement check. */
  readonly placed: readonly Placed[];
}

/** Marks stand at the top right beside their element, as in the other kinds. */
function marks(m: UseCaseModel, grid: GridLayout): MarkSpot[] {
  return grid.nodes.flatMap((p) => {
    const id = (m.actors.get(p.id) ?? m.cases.get(p.id))?.mark;
    return id ? [{ id, x: p.rect.x + p.rect.w + 20, y: p.rect.y - 2 }] : [];
  });
}

/**
 * Layout of a use case diagram: the arrangement laid out by the layout graph and priced by the line check
 * (`arrangeUseCase`), then the sheet around title, picture and decision bar.
 */
export function layoutUseCase(m: UseCaseModel, words: PictureTexts): UseCaseLayout {
  const t = arrangeUseCase(m, priceOf(m));
  const captionBottom = Math.max(0, ...captionBoxes(t.spec, t.layout).map((c) => c.rect.y + c.rect.h));
  const notes = t.comments.map((c) => c.rect);
  const bottom = Math.max(
    t.layout.bottom,
    captionBottom + UC_GRID.framePad.bottom,
    ...notes.map((r) => r.y + r.h + UC_GRID.margin),
  );
  const width = Math.ceil(
    Math.max(
      t.layout.width,
      ...notes.map((r) => r.x + r.w + UC_GRID.margin),
      textWidth(words.title, UC_FONTS.title) + 2 * MARGIN,
      stripWidth(m.diagram.decisions, words.open),
    ),
  );
  const strip = decisionStrip(m.diagram.decisions, bottom, width);
  return {
    header: HEADER,
    width,
    height: Math.ceil((strip.cards.length > 0 ? strip.bottom : bottom) + UC_GRID.margin),
    spec: t.spec,
    grid: t.layout,
    routes: t.routes,
    drawn: drawnOf(m, t.routes),
    labels: t.labels,
    comments: t.comments,
    marks: marks(m, t.layout),
    strip,
    placed: placedAll(t, m),
  };
}
