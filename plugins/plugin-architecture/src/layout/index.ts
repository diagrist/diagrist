import type { Placed, Point, Rect } from '@diagrist/core';
import type { Locale } from '@diagrist/lang';
import {
  bottom,
  type EdgeLabel,
  fitFrames,
  labelEdges,
  placedOf,
  placeGrid,
  type Route,
  right,
  routeEdges,
} from '@diagrist/layout-grid';
import { decisionStrip, type Legend, legendLayout, type Sheet, type Strip, sheetOf, WORDS } from '@diagrist/parts';
import { lookOf } from '../looks/index.js';
import type { Look } from '../looks/look.js';
import type { ArchGroup, ArchitectureModel, ArchNode } from '../model/types.js';
import type { Texts } from '../texts/index.js';
import { SENTENCE_WORDS } from '../texts/sentence.js';
import { type NodeArt, nodeArt } from './art.js';
import { type FrameHead, frameHead } from './heads.js';
import { type LayerArt, layerArts } from './layers.js';
import { legendItems, type Sample } from './legend.js';
import { type Badge, type Mark, marksOf } from './marks.js';
import { type NoteArt, noteArts } from './notes.js';
import { marksInside, seatBadges } from './seat.js';
import { legendSentences } from './sentence.js';
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
  /** The look the layout measured with, which the scene draws in. */
  readonly look: Look;
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
  /** Only with `legend: strip`; other looks explain themselves through icons and colours, or in sentences. */
  readonly legend?: Legend<Sample>;
  /** Only with `decisions: notes` or `legend: sentence`: notes in the margin, the legend as sentences. */
  readonly sheet?: Sheet;
  readonly width: number;
  readonly height: number;
  readonly placed: readonly Placed[];
}

/**
 * Lays out a C4 diagram on `layout-grid`: measures the nodes, places and routes them, labels the edges, lets frames
 * grow around their routes in an adaptive grid, then adds heads, flow numbers, marks, layers, notes, the decision
 * bar and the legend.
 */
export function layoutArchitecture(model: ArchitectureModel, texts: Texts, locale: Locale): ArchitectureLayout {
  const look = lookOf(model);
  const { metrics: m, options: o } = look;
  const { spec, texts: edgeTexts } = gridSpecOf(model, look);
  const grid = placeGrid(spec);
  const routes = routeEdges(spec, grid);
  const onLine = o.edgeText.place === 'onLine';
  const found = labelEdges(spec, grid, routes, edgeTexts, { preferFlat: o.edgeText.flat, onLine });
  const pl = spec.adaptive ? fitFrames(spec, grid, routes, found) : grid;
  const lines: readonly (readonly Point[])[] = spec.adaptive ? routes.map((r) => r.points) : [];
  const byId = new Map(model.nodes.map((n) => [n.id, n]));
  const nodes = pl.nodes.flatMap((p) => {
    const node = byId.get(p.id);
    return node ? [{ node, rect: p.rect, art: nodeArt(node, p.rect, look) }] : [];
  });
  const frames = pl.groups.flatMap((p) => {
    const group = model.groups.find((g) => g.id === p.id);
    return group ? [{ group, rect: p.rect, head: frameHead(p.rect, group, look, lines) }] : [];
  });
  const rects = new Map(pl.nodes.map((p) => [p.id, p.rect]));
  const { badges: numbers, marks: aside } = marksOf(model, routes, rects, m);
  const seated = o.numbers.seat === 'seated';
  const { badges, labels } = seated ? seatBadges(numbers, found, routes) : { badges: numbers, labels: found };
  const marks = o.marks === 'inside' ? marksInside(aside, model.nodes, rects) : aside;
  const routeRight = Math.max(0, ...routes.flatMap((r) => r.points.map((p) => p[0])));
  const contentRight = Math.max(
    routeRight,
    ...pl.groups.map((g) => right(g.rect)),
    ...pl.nodes.map((n) => right(n.rect)),
  );
  const layers = layerArts(model.layers, pl.rows, contentRight, look);
  const crests = new Map(spec.nodes.map((n) => [n.id, n.crest ?? 0]));
  const notes = noteArts(model.notes, rects, (id) => crests.get(id) ?? 0, look.fonts.note);
  const strip = decisionStrip(o.decisions === 'bar' ? model.decisions : [], pl.bottom, pl.width);
  const legend =
    o.legend === 'strip'
      ? legendLayout(legendItems(model, routes, marks.length > 0, texts, look.fonts.note), strip.bottom, pl.width)
      : undefined;
  const noteBottom = Math.max(0, ...notes.map((n) => bottom(n.rect) + m.groupPadBottom));
  const body = strip.cards.length > 0 ? strip.bottom : Math.max(pl.bottom, noteBottom);
  const beside = [
    ...(spec.adaptive ? [routeRight, ...layers.map((l) => right(l.rect))] : []),
    ...notes.map((n) => right(n.rect)),
  ];
  const width = Math.max(pl.width, ...beside.map((x) => x + m.marginX));
  const sentences = o.legend === 'sentence';
  const sheet =
    o.decisions === 'notes' || sentences
      ? sheetOf({
          decisions: o.decisions === 'notes' ? model.decisions : [],
          sentences: sentences ? legendSentences(model, routes, marks.length > 0, texts, SENTENCE_WORDS[locale]) : [],
          top: Math.min(...pl.groups.map((g) => g.rect.y), ...pl.nodes.map((n) => n.rect.y)),
          right: width - m.marginX,
          bottom: body,
          width,
          margin: m.margin,
          open: WORDS[locale].open,
          font: look.fonts.label,
        })
      : undefined;
  return {
    look,
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
    ...(sheet ? { sheet } : {}),
    width: sheet?.width ?? width,
    height: sheet?.height ?? (legend ? Math.max(strip.bottom + m.legendReserve, legend.bottom) : body + m.margin),
    placed: placedOf(spec, pl, routes, labels),
  };
}
