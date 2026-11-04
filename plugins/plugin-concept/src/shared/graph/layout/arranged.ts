import type { Placed, Rect } from '@diagrist/core';
import type { Locale } from '@diagrist/lang';
import {
  type CoreFrame,
  type EdgeLabel,
  fitFrames,
  labelEdges,
  placedOf,
  placeGrid,
  type Route,
  routeEdges,
} from '@diagrist/layout-grid';
import { MARGIN } from '@diagrist/parts';
import type { Graph } from '../model.js';
import { type PlacedHead, type PlacedVerb, placeHeads } from './heads.js';
import { layeredGraph } from './layered.js';
import type { ItemBox } from './metrics.js';
import { graphGrid } from './spec.js';

/** Placed, routed and labelled; a second time with room on the left when a label stands left of the margin. */
function placed(m: Graph, locale: Locale, headed: boolean, indent = 0) {
  const at = graphGrid(m, locale, indent, headed);
  const grid = placeGrid(at.spec);
  const routes = routeEdges(at.spec, grid);
  const labels = labelEdges(at.spec, grid, routes, at.texts);
  const left = Math.min(MARGIN, ...labels.map((l) => l.box.x));
  if (left < MARGIN && indent === 0) return placed(m, locale, headed, Math.ceil((MARGIN - left) / 8) * 8);
  return { ...at, grid, routes, labels };
}

/** Where the items, lines and labels of a picture stand, however it was arranged. */
export interface Arranged {
  readonly nodes: readonly { readonly id: string; readonly rect: Rect }[];
  readonly routes: readonly Route[];
  readonly labels: readonly EdgeLabel[];
  readonly boxes: ReadonlyMap<string, ItemBox>;
  readonly heads: readonly PlacedHead[];
  readonly verbs: readonly PlacedVerb[];
  readonly width: number;
  readonly bottom: number;
  readonly placed: readonly Placed[];
  /** The frame around the core of a hub, with its head. */
  readonly frame?: CoreFrame;
}

/** A picture in columns, on the grid of `layout-grid`, with the heads of its columns. */
export function inGrid(m: Graph, locale: Locale, headed: boolean): Arranged {
  const { spec, boxes, grid, routes, labels, heads: named, verbs } = placed(m, locale, headed);
  const fitted = fitFrames(spec, grid, routes, labels);
  const row = placeHeads(fitted, named, verbs, m.links);
  return {
    nodes: fitted.nodes,
    routes,
    labels,
    boxes,
    heads: row.heads,
    verbs: row.verbs,
    width: fitted.width,
    bottom: fitted.bottom,
    placed: [...placedOf(spec, fitted, routes, labels), ...row.placed],
  };
}

/** A picture in layers, laid out by the layered pipeline of `layout-grid` (plan L3). */
export function inLayers(m: Graph, locale: Locale): Arranged {
  const { layout, boxes } = layeredGraph(m, locale);
  return {
    ...layout,
    boxes,
    heads: [],
    verbs: [],
    width: layout.width + MARGIN,
    bottom: layout.bottom + MARGIN,
  };
}
