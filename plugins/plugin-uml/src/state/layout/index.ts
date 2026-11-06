import { type Placed, textWidth } from '@diagrist/core';
import type { EdgeLabel, GridLayout, Route } from '@diagrist/layout-grid';
import { decisionStrip, HEADER, type Header, MARGIN, type Strip, stripWidth, type Words } from '@diagrist/parts';
import { type NoteArt, noteArts } from '../../shared/notes.js';
import type { StateModel } from '../model.js';
import { gridState } from './grid.js';
import { laidState, onEngine } from './laid.js';
import { STATE_FONTS as F, STATE as S } from './metrics.js';
import { placedState } from './placed.js';
import { type PointName, pointNames } from './points/names.js';
import type { TransitionEnds } from './route/context.js';

/** The texts of the picture the layout measures: the title line, and the suffix of open decisions. */
export type PictureTexts = Pick<Words, 'open'> & {
  /** Title line: kind and title, such as `State machine diagram (UML) · Order`. */
  readonly title: string;
};

/** Everything the scene draws, in picture pixels. */
export interface StateLayout {
  readonly header: Header;
  readonly width: number;
  readonly height: number;
  readonly grid: GridLayout;
  readonly routes: readonly Route[];
  /** Ends of each route, by route index. */
  readonly ends: readonly TransitionEnds[];
  readonly labels: readonly EdgeLabel[];
  readonly names: ReadonlyMap<string, PointName>;
  readonly notes: readonly NoteArt[];
  readonly marks: readonly { readonly id: string; readonly x: number; readonly y: number }[];
  readonly strip: Strip;
  readonly placed: readonly Placed[];
}

/**
 * Layout of a state machine: laid out by the layout engine (`laidState`) where it can, else on the adaptive grid
 * (`gridState`); then names of points, notes, marks and the decision bar.
 */
export function layoutState(m: StateModel, words: PictureTexts): StateLayout {
  const { spec, grid: fitted, routes, labels, context } = onEngine(m) ? laidState(m) : gridState(m);
  const notes = noteArts(m.diagram.notes, fitted, routes, labels);
  const bottom = Math.max(fitted.bottom, ...notes.map((n) => n.rect.y + n.rect.h + S.padBottom));
  const width = Math.ceil(
    Math.max(
      fitted.width,
      ...notes.map((n) => n.rect.x + n.rect.w + S.marginX),
      textWidth(words.title, F.title) + 2 * MARGIN,
      stripWidth(m.diagram.decisions, words.open),
    ),
  );
  const strip = decisionStrip(m.diagram.decisions, bottom, width);
  const names = pointNames(m, fitted, routes, labels);
  return {
    header: HEADER,
    width,
    height: Math.ceil((strip.cards.length > 0 ? strip.bottom : bottom) + S.margin),
    grid: fitted,
    routes,
    ends: context.ends,
    labels,
    names,
    notes,
    marks: fitted.nodes.flatMap((p) => {
      const id = m.vertices.get(p.id)?.mark;
      return id ? [{ id, x: p.rect.x + p.rect.w + 20, y: p.rect.y - 2 }] : [];
    }),
    strip,
    placed: placedState(m, { spec, grid: fitted, routes, labels, names, notes }),
  };
}
