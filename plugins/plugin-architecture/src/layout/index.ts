import type { Placed, Point, Rect } from '@diagrist/core';
import {
  type EdgeLabel,
  fitFrames,
  labelEdges,
  placedOf,
  placeGrid,
  type Route,
  routeEdges,
} from '@diagrist/layout-grid';
import { decisionStrip, type Legend, legendLayout, type Strip } from '@diagrist/parts';
import type { ArchGroup, ArchitectureModel, ArchNode } from '../model/types.js';
import type { Texts } from '../texts/index.js';
import { type NodeArt, nodeArt } from './art.js';
import { type FrameHead, frameHead } from './heads.js';
import { type LayerArt, layerArts } from './layers.js';
import { legendItems, type Sample } from './legend.js';
import { type Badge, type Mark, marksOf } from './marks.js';
import type { Sizing } from './measure.js';
import { metricsOf } from './metrics.js';
import { type NoteArt, noteArts } from './notes.js';
import { gridSpecOf } from './spec.js';

/** An element in the picture with everything inside it. */
export interface PlacedElement {
  readonly node: ArchNode;
  readonly rect: Rect;
  readonly art: NodeArt;
}

/** A frame in the picture with its head. */
export interface PlacedFrame {
  readonly group: ArchGroup;
  readonly rect: Rect;
  readonly head: FrameHead;
}

/** Where everything of a C4 picture stands; the scene only draws it. */
export interface ArchitectureLayout {
  readonly sizing: Sizing;
  readonly nodes: readonly PlacedElement[];
  /** Parents first, the order to draw them in. */
  readonly frames: readonly PlacedFrame[];
  readonly routes: readonly Route[];
  readonly labels: readonly EdgeLabel[];
  readonly badges: readonly Badge[];
  readonly marks: readonly Mark[];
  readonly layers: readonly LayerArt[];
  readonly notes: readonly NoteArt[];
  readonly strip: Strip;
  /** Only in `look=plain`; cards and blocks explain themselves through icons and colours. */
  readonly legend?: Legend<Sample>;
  readonly width: number;
  readonly height: number;
  readonly placed: readonly Placed[];
}

const right = (r: Rect): number => r.x + r.w;
const bottom = (r: Rect): number => r.y + r.h;

/**
 * Lays out a C4 diagram on `layout-grid`: measures the nodes, places and routes them, labels the edges, lets frames
 * grow around their routes in an adaptive grid, then adds heads, flow numbers, marks, layers, notes, the decision
 * bar and the legend.
 */
export function layoutArchitecture(model: ArchitectureModel, texts: Texts): ArchitectureLayout {
  const sizing: Sizing = { look: model.look, m: metricsOf(model.look) };
  const m = sizing.m;
  const { spec, texts: edgeTexts } = gridSpecOf(model, sizing);
  const grid = placeGrid(spec);
  const routes = routeEdges(spec, grid);
  const labels = labelEdges(spec, grid, routes, edgeTexts, { preferFlat: model.look === 'cards' });
  const pl = spec.adaptive ? fitFrames(spec, grid, routes, labels) : grid;
  const lines: readonly (readonly Point[])[] = spec.adaptive ? routes.map((r) => r.points) : [];
  const byId = new Map(model.nodes.map((n) => [n.id, n]));
  const nodes = pl.nodes.flatMap((p) => {
    const node = byId.get(p.id);
    return node ? [{ node, rect: p.rect, art: nodeArt(node, p.rect, sizing) }] : [];
  });
  const frames = pl.groups.flatMap((p) => {
    const group = model.groups.find((g) => g.id === p.id);
    return group ? [{ group, rect: p.rect, head: frameHead(p.rect, group, sizing, lines) }] : [];
  });
  const rects = new Map(pl.nodes.map((p) => [p.id, p.rect]));
  const { badges, marks } = marksOf(model, routes, rects, m);
  const routeRight = Math.max(0, ...routes.flatMap((r) => r.points.map((p) => p[0])));
  const contentRight = Math.max(
    routeRight,
    ...pl.groups.map((g) => right(g.rect)),
    ...pl.nodes.map((n) => right(n.rect)),
  );
  const layers = layerArts(model.layers, pl.rows, contentRight, m);
  const crest = (id: string) => crestOf(nodes, id, m.cardIconR);
  const notes = noteArts(model.notes, rects, crest, m);
  const strip = decisionStrip(model.decisions, pl.bottom, pl.width);
  const items = legendItems(model, routes, marks.length > 0, texts, m);
  const legend = model.look === 'plain' ? legendLayout(items, strip.bottom, pl.width) : undefined;
  const noteBottom = Math.max(0, ...notes.map((n) => bottom(n.rect) + m.groupPadBottom));
  const body = strip.cards.length > 0 ? strip.bottom : Math.max(pl.bottom, noteBottom);
  const beside = [
    ...(spec.adaptive ? [routeRight, ...layers.map((l) => right(l.rect))] : []),
    ...notes.map((n) => right(n.rect)),
  ];
  return {
    sizing,
    nodes,
    frames,
    routes,
    labels,
    badges,
    marks,
    layers,
    notes,
    strip,
    ...(legend ? { legend } : {}),
    width: Math.max(pl.width, ...beside.map((x) => x + m.marginX)),
    height: legend ? Math.max(strip.bottom + m.legendReserve, legend.bottom) : body + m.margin,
    placed: placedOf(spec, pl, routes, labels),
  };
}

/** How far the icon circle of a card reaches above its node, so a note stands above it. */
function crestOf(nodes: readonly PlacedElement[], id: string, radius: number): number {
  const art = nodes.find((n) => n.node.id === id)?.art;
  return art?.kind === 'box' && art.card?.form === 'card' && art.card.circle ? radius : 0;
}
