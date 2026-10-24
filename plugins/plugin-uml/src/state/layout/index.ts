import { type Placed, textWidth } from '@diagrist/core';
import {
  type EdgeLabel,
  fitFrames,
  type GridLayout,
  type Pads,
  placedOf,
  placeGrid,
  placeLabels,
  type Route,
} from '@diagrist/layout-grid';
import { decisionStrip, HEADER, type Header, MARGIN, type Strip, stripWidth, type Words } from '@diagrist/parts';
import { homed } from '../../class/layout/homed.js';
import { type NoteArt, noteArts } from '../../class/layout/notes.js';
import type { StateModel } from '../model.js';
import { stretchBars } from './bars.js';
import { stateCells } from './cells.js';
import { frameGrowth } from './growth.js';
import { transitionTexts } from './labels.js';
import { STATE_FONTS as F, STATE as S } from './metrics.js';
import { borderOf, hostOf } from './points/geometry.js';
import { placeBorderPoints } from './points/index.js';
import { type PointName, pointNames } from './points/names.js';
import { routeStates } from './route/index.js';
import { stateGridSpec } from './spec.js';

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
  readonly ends: readonly { readonly from: string; readonly to: string; readonly emph?: boolean }[];
  readonly labels: readonly EdgeLabel[];
  readonly names: ReadonlyMap<string, PointName>;
  readonly notes: readonly NoteArt[];
  readonly marks: readonly { readonly id: string; readonly x: number; readonly y: number }[];
  readonly strip: Strip;
  readonly placed: readonly Placed[];
}

/** Second runs for frames that grow around their border points, and for room left of rails. */
const PASSES = 3;

/** More left margin, so rails and their labels left of everything stay inside the picture. */
function outerReserve(routes: readonly Route[], labels: readonly EdgeLabel[]): number {
  const left = Math.min(...routes.flatMap((r) => r.points.map((p) => p[0])), ...labels.map((l) => l.box.x));
  const need = S.margin + S.padSide - left;
  return need > 0 ? Math.ceil(need / S.grid) * S.grid : 0;
}

/**
 * Layout of a state machine: the automatic grid of layers placed by `layout-grid`, bars stretched, entry and exit
 * points on their borders, routes and labels; then more margin for rails reaching out left, and frames grown for their
 * points, each a second run; finally names of points, notes, marks and the decision bar.
 */
export function layoutState(m: StateModel, words: PictureTexts): StateLayout {
  const cells = stateCells(m);
  let pads = new Map<string, Pads>();
  let margin = 0;
  let grown = 0;
  for (let run = 0; ; run++) {
    const spec = stateGridSpec(m, cells, pads, margin);
    const placed = placeBorderPoints(m, stretchBars(placeGrid(spec), m));
    const routing = routeStates(m, spec, placed);
    const { routes, context } = routing;
    const texts = routes.flatMap((r, i) => transitionTexts(context.lines[i] ?? [], r, i));
    const labels = placeLabels(routing.spec, placed, routes, texts);
    const reserve = outerReserve(routes, labels);
    if (reserve > 0 && run < 2 * PASSES) {
      margin += reserve;
      continue;
    }
    const fitted = fitFrames(routing.spec, placed, routes, labels);
    const more =
      grown < PASSES ? frameGrowth(m, { before: placed, after: fitted, routes, labels, ...context }, pads) : undefined;
    if (more) {
      pads = more;
      grown++;
      continue;
    }
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
    const points = new Set(fitted.nodes.flatMap((n) => (borderOf(m, n.id) || hostOf(m, n.id) ? [n.id] : [])));
    return {
      header: HEADER,
      width,
      height: Math.ceil((strip.cards.length > 0 ? strip.bottom : bottom) + S.margin),
      grid: fitted,
      routes,
      ends: context.ends,
      labels,
      names: pointNames(m, fitted, routes, labels),
      notes,
      marks: fitted.nodes.flatMap((p) => {
        const id = m.vertices.get(p.id)?.mark;
        return id ? [{ id, x: p.rect.x + p.rect.w + 20, y: p.rect.y - 2 }] : [];
      }),
      strip,
      placed: [
        ...placedOf(routing.spec, fitted, routes, labels).filter((p) => !points.has(p.key)),
        ...notes.map((n, i): Placed => ({ key: `${n.on}.note.${i + 1}`, kind: 'box', rect: n.rect })),
      ].map((p) => homed(p, fitted)),
    };
  }
}
