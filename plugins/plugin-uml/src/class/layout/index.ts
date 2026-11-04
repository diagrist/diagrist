import { type Placed, textWidth } from '@diagrist/core';
import { type EdgeLabel, type GridLayout, type Route, right } from '@diagrist/layout-grid';
import { decisionStrip, HEADER, type Header, MARGIN, type Strip, stripWidth, type Words } from '@diagrist/parts';
import { type NoteArt, noteArts } from '../../shared/notes.js';
import type { ClassRelation } from '../diagram.js';
import type { ClassModel } from '../model.js';
import { endLabels } from './ends.js';
import { type Tether, tethers } from './extras.js';
import { CLASS_FONTS } from './metrics.js';
import { nameLabels } from './names.js';
import { classPlaced, tabOf } from './placed.js';
import { routeClass } from './routed.js';

/** The texts of the picture the layout measures: the title line, and the suffix of open decisions. */
export type PictureTexts = Pick<Words, 'open'> & {
  /** Title line: kind and title, such as `Class diagram (UML) · Shop`. */
  readonly title: string;
};

/** A decision mark beside an element. */
export interface MarkSpot {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

/** Everything the scene draws, in picture pixels. */
export interface ClassLayout {
  readonly header: Header;
  readonly width: number;
  readonly height: number;
  readonly grid: GridLayout;
  readonly routes: readonly Route[];
  /** The relation of each route, by route index. */
  readonly relations: readonly (ClassRelation | undefined)[];
  /** Ids of the edges that share a triangle with others. */
  readonly bundles: ReadonlySet<string>;
  readonly labels: readonly EdgeLabel[];
  readonly tethers: readonly Tether[];
  readonly notes: readonly NoteArt[];
  readonly marks: readonly MarkSpot[];
  readonly strip: Strip;
  readonly placed: readonly Placed[];
}

/** Marks stand at the top right beside their classifier or diamond. */
function marks(m: ClassModel, grid: GridLayout): MarkSpot[] {
  return grid.nodes.flatMap((p) => {
    const id = (m.classifiers.get(p.id) ?? m.associations.get(p.id))?.mark;
    return id ? [{ id, x: right(p.rect) + 20, y: p.rect.y - 2 }] : [];
  });
}

/** Room around the picture right of and below everything placed. */
const EDGE = 48;

/**
 * Layout of a class diagram on the layered pipeline of `layout-grid`: classes in the layers and order of the
 * automatic grid, placed and routed by the pipeline, packages as its frames; names beside their lines, end texts at
 * the ends, legs at the vertices of their diamond; then association classes, notes, marks and the decision bar.
 */
export function layoutClass(m: ClassModel, words: PictureTexts): ClassLayout {
  const routed = routeClass(m);
  const { grid, routes, relations, trunks } = routed;
  const mates = (i: number) => {
    const t = trunks.get(routes[i]?.edge ?? '');
    return new Set(t === undefined ? [] : routes.flatMap((x, k) => (k !== i && trunks.get(x.edge) === t ? [k] : [])));
  };
  const boxes = [...grid.nodes.map((n) => n.rect), ...grid.groups.map((g) => tabOf(m, g))];
  const named = nameLabels(relations, routes, routed.labels, { boxes, routes, mates });
  const ends = endLabels(relations, routes, { boxes, frames: grid.groups.map((g) => g.rect), mates }, named);
  const labels = [...named, ...ends];
  const dashed = tethers(routes, relations, m, grid);
  const lines = dashed.map(
    (t): Route => ({ edge: '', points: [t.a, t.b], shape: 'straight', fromSide: 'top', toSide: 'top' }),
  );
  const notes = noteArts(m.diagram.notes, grid, [...routes, ...lines], labels, true);
  const xs = [...labels.map((l) => right(l.box)), ...routes.flatMap((r) => r.points.map((p) => p[0]))];
  const ys = [...labels.map((l) => l.box.y + l.box.h), ...routes.flatMap((r) => r.points.map((p) => p[1]))];
  const bottom = Math.max(grid.bottom, ...ys, ...notes.map((n) => n.rect.y + n.rect.h)) + EDGE;
  const width = Math.ceil(
    Math.max(
      Math.max(grid.width, ...xs, ...notes.map((n) => right(n.rect))) + EDGE,
      textWidth(words.title, CLASS_FONTS.title) + 2 * MARGIN,
      stripWidth(m.diagram.decisions, words.open),
    ),
  );
  const strip = decisionStrip(m.diagram.decisions, bottom, width);
  const shared = (r: ClassRelation | undefined) => r?.kind === 'generalization' || r?.kind === 'realization';
  return {
    header: HEADER,
    width,
    height: Math.ceil(strip.cards.length > 0 ? strip.bottom + 32 : bottom),
    grid,
    routes,
    relations,
    bundles: new Set(routes.flatMap((r, i) => (trunks.has(r.edge) && shared(relations[i]) ? [r.edge] : []))),
    labels,
    tethers: dashed,
    notes,
    marks: marks(m, grid),
    strip,
    placed: classPlaced(m, routed, labels, notes),
  };
}
