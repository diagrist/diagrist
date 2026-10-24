import { type Placed, textWidth } from '@diagrist/core';
import {
  type EdgeLabel,
  type EdgeText,
  fitFrames,
  type GridLayout,
  type GridSpec,
  grow,
  labelEdges,
  placedOf,
  placeGrid,
  type Route,
  routeEdges,
} from '@diagrist/layout-grid';
import { decisionStrip, HEADER, type Header, MARGIN, type Strip, stripWidth, type Words } from '@diagrist/parts';
import { homed } from '../../shared/homed.js';
import { type NoteArt, noteArts } from '../../shared/notes.js';
import type { ClassRelation } from '../diagram.js';
import type { ClassModel } from '../model.js';
import { classCells } from './cells.js';
import { endLabels } from './ends.js';
import { belowTabs, legsAtVertices, type Tether, tethers } from './extras.js';
import { CLASS_FONTS } from './metrics.js';
import { clearPackageLines } from './package-lines.js';
import { alignPackages, packageExtents, tabGrowth } from './packages.js';
import { classGridSpec, edgeId } from './spec.js';

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

const right = (r: { x: number; w: number }) => r.x + r.w;

/** Second runs a class diagram allows itself for packages whose tab a line crosses. */
const GROWTH_PASSES = 3;

/** Name of the relation, and `«import»` or `«access»` below it, for the labelling of `layout-grid`. */
function texts(routes: readonly Route[], relations: readonly (ClassRelation | undefined)[]): EdgeText[] {
  return routes.flatMap((r, i): EdgeText[] => {
    const rel = relations[i];
    if (!rel) return [];
    const detail = rel.keyword ? `«${rel.keyword}»` : undefined;
    return rel.label || detail
      ? [
          {
            edge: r.edge,
            ...(rel.label ? { name: rel.label } : {}),
            ...(detail ? { detail } : {}),
            accent: rel.emph === true,
          },
        ]
      : [];
  });
}

/** Marks stand at the top right beside their classifier or diamond. */
function marks(m: ClassModel, grid: GridLayout): MarkSpot[] {
  return grid.nodes.flatMap((p) => {
    const id = (m.classifiers.get(p.id) ?? m.associations.get(p.id))?.mark;
    return id ? [{ id, x: right(p.rect) + 20, y: p.rect.y - 2 }] : [];
  });
}

/**
 * Layout of a class diagram on `layout-grid`: the automatic grid in layers, routes around the boxes, legs at the
 * vertices of their diamond and package dependencies below the tab, names placed by the grid and end texts by the
 * kind, frames grown around their routes; then association classes, notes, marks and the decision bar.
 */
export function layoutClass(m: ClassModel, words: PictureTexts): ClassLayout {
  const cells = classCells(m);
  const extents = packageExtents(m, cells);
  const byEdge = new Map(m.diagram.relations.map((r, i) => [edgeId(i), r]));
  const run = (spec: GridSpec) => {
    const grid = alignPackages(m, placeGrid(spec), extents);
    const raw = routeEdges(spec, grid);
    return { spec, grid, raw, relations: raw.map((r) => byEdge.get(r.edge)) };
  };
  let pass = run(classGridSpec(m, cells));
  for (let i = 0; i < GROWTH_PASSES; i++) {
    const pads = tabGrowth(m, pass.grid, pass.raw, pass.relations);
    if (!pads.size) break;
    pass = run(grow(pass.spec, pads));
  }
  const { spec, grid, raw, relations } = pass;
  const cleared = clearPackageLines(raw, relations, m, grid);
  const routes = legsAtVertices(belowTabs(cleared, relations, m, grid), relations, m, grid);
  const named = labelEdges(spec, grid, routes, texts(routes, relations));
  const ends = endLabels(relations, routes, grid, named);
  const labels = [...named, ...ends];
  const fitted = fitFrames(spec, grid, routes, labels);
  const notes = noteArts(m.diagram.notes, fitted, routes, labels);
  const noteBottom = Math.max(0, ...notes.map((n) => n.rect.y + n.rect.h + 24));
  const bottom = Math.max(fitted.bottom, noteBottom);
  const width = Math.ceil(
    Math.max(
      fitted.width,
      ...notes.map((n) => right(n.rect) + 48),
      textWidth(words.title, CLASS_FONTS.title) + 2 * MARGIN,
      stripWidth(m.diagram.decisions, words.open),
    ),
  );
  const strip = decisionStrip(m.diagram.decisions, bottom, width);
  return {
    header: HEADER,
    width,
    height: Math.ceil((strip.cards.length > 0 ? strip.bottom : bottom) + 32),
    grid: fitted,
    routes,
    relations,
    bundles: new Set(spec.edges.flatMap((e) => (e.bundle ? [e.id] : []))),
    labels,
    tethers: tethers(routes, relations, m, fitted),
    notes,
    marks: marks(m, fitted),
    strip,
    placed: [
      ...placedOf(spec, fitted, routes, labels),
      ...notes.map((n, i): Placed => ({ key: `${n.on}.note.${i + 1}`, kind: 'box', rect: n.rect })),
    ].map((p) => homed(p, fitted)),
  };
}
