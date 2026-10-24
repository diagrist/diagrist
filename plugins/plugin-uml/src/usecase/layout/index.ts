import { type Placed, textWidth } from '@diagrist/core';
import { type EdgeLabel, type GridLayout, type GridSpec, placedOf, type Route } from '@diagrist/layout-grid';
import { decisionStrip, HEADER, type Header, MARGIN, type Strip, stripWidth, type Words } from '@diagrist/parts';
import type { UseCaseModel } from '../model.js';
import { captionBoxes, drawnOf } from './annotate.js';
import type { Comment } from './art.js';
import { fitUseCase } from './fit.js';
import type { Drawn } from './labels.js';
import { UC_FONTS, UC_GRID } from './metrics.js';

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

function placedAll(t: ReturnType<typeof fitUseCase>, m: UseCaseModel): Placed[] {
  const lines = t.labels.filter((l) => l.part !== 'detail');
  const grid = placedOf(t.spec, t.layout, t.routes, lines).map((p) => (p.kind === 'text' ? homed(p, t.layout) : p));
  const captions = captionBoxes(t.spec, t.layout).map(
    (c): Placed => ({ key: `${c.id}.name`, kind: 'text', rect: c.rect, ...span(m.actors.get(c.id)?.span) }),
  );
  const notes = t.comments.flatMap((c, i): Placed[] => {
    const key = `${c.on ?? t.routes[c.route ?? -1]?.edge ?? ''}.note.${i + 1}`;
    const texts = t.labels.filter((l) => l.part === 'detail' && l.route === c.route && c.route !== undefined);
    return [
      homed({ key, kind: 'box', rect: c.rect }, t.layout),
      ...texts.map((l, k): Placed => ({ key: `${key}.${k + 1}`, kind: 'text', rect: l.box, within: key })),
    ];
  });
  return [...grid, ...captions, ...notes];
}

/**
 * A label or note without a frame of its own belongs into the innermost frame around it, where the layout put it: a
 * multiplicity at a use case inside its subject, a note beside it. One lying on a frame line stays without.
 */
function homed(p: Placed, grid: GridLayout): Placed {
  if (p.within !== undefined) return p;
  const r = p.rect;
  const around = grid.groups.filter(
    (g) =>
      g.id !== p.key &&
      r.x >= g.rect.x &&
      r.y >= g.rect.y &&
      r.x + r.w <= g.rect.x + g.rect.w &&
      r.y + r.h <= g.rect.y + g.rect.h,
  );
  const home = around.at(-1);
  return home ? { ...p, within: home.id } : p;
}

const span = <T>(s: T | undefined) => (s === undefined ? {} : { span: s });

/**
 * Layout of a use case diagram: the automatic grid placed by `layout-grid` with straight lines, labels and notes
 * at free spots, frames grown around them; then the sheet around title, picture and decision bar.
 */
export function layoutUseCase(m: UseCaseModel, words: PictureTexts): UseCaseLayout {
  const t = fitUseCase(m);
  const captionBottom = Math.max(0, ...captionBoxes(t.spec, t.layout).map((c) => c.rect.y + c.rect.h));
  const bottom = Math.max(t.layout.bottom, captionBottom + UC_GRID.framePad.bottom);
  const width = Math.ceil(
    Math.max(
      t.layout.width,
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
