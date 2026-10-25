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
  seatMarks,
} from '@diagrist/layout-grid';
import { decisionStrip, type Legend, legendLayout, type Sheet, type Strip } from '@diagrist/parts';
import { lookOf } from '../looks/index.js';
import type { Look } from '../looks/look.js';
import type { ArchGroup, ArchitectureModel, ArchNode } from '../model/types.js';
import { BAND_WORDS } from '../texts/bands.js';
import type { Texts } from '../texts/index.js';
import { type NodeArt, nodeArt } from './art.js';
import { type BandSheet, bandFrameOf, bandSheetOf } from './bands/index.js';
import { type Context, contextOf } from './focus.js';
import { type FrameHead, frameHead } from './heads.js';
import { type LayerArt, layerArts } from './layers.js';
import { legendItems, type Sample } from './legend.js';
import { type Badge, type Mark, markRect, marksInside, marksOf, NUMBER_ROOM, NUMBER_SIZE, TEXT_GAP } from './marks.js';
import { type NoteArt, noteArts } from './notes.js';
import { sheetFor } from './sheet.js';
import { crestOf, gridSpecOf } from './spec.js';

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
  /** Heads of column and row bands, with `groups.form: band` and `layers: bands`; empty in other looks. */
  readonly bands: BandSheet;
  /** What `focus: dim` greys; empty in every other look. */
  readonly context: Context;
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
  const frame = bandFrameOf(model, look);
  const { spec, texts: edgeTexts } = gridSpecOf(frame.model, look, frame);
  const grid = placeGrid(spec);
  const routes = routeEdges(spec, grid);
  const onLine = o.edgeText.place === 'onLine' ? { onLine: { pad: TEXT_GAP, avoid: [] } } : {};
  const found = labelEdges(spec, grid, routes, edgeTexts, { preferFlat: o.edgeText.flat, ...onLine });
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
  const size = NUMBER_SIZE[o.numbers.form];
  const { marks: badges, labels } =
    o.numbers.seat === 'seated'
      ? seatMarks(numbers, found, routes, {
          r: size.w / 2,
          room: NUMBER_ROOM,
          predecessor: look.crutches?.predecessorSeat === true,
        })
      : { marks: numbers, labels: found };
  const numbered = badges.map((b) => ({ route: b.route, rect: { x: b.x - size.w / 2, y: b.y - size.h / 2, ...size } }));
  const marks = o.marks === 'inside' ? marksInside(aside, model.nodes, rects) : aside;
  const signs = [...numbered.map((b) => b.rect), ...marks.map(markRect)];
  const bands = bandSheetOf(frame, { grid: pl, routes, labels, signs }, texts, BAND_WORDS[locale], look);
  const routeRight = Math.max(0, ...routes.flatMap((r) => r.points.map((p) => p[0])));
  const contentRight = Math.max(
    routeRight,
    ...pl.groups.map((g) => right(g.rect)),
    ...pl.nodes.map((n) => right(n.rect)),
  );
  const layers = layerArts(model.layers, pl.rows, contentRight, look);
  const crest = (id: string) => {
    const node = byId.get(id);
    return node ? crestOf(node, look) : 0;
  };
  const notes = noteArts(model.notes, rects, crest, look.fonts.note);
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
  const context = contextOf(model, look);
  const content = { grid: pl, routes, frames: frames.map((f) => f.group), marked: marks.length > 0, context };
  const sheet = sheetFor(model, look, { ...content, width, bottom: body }, texts, locale);
  return {
    look,
    nodes,
    frames,
    routes,
    labels,
    badges,
    marks,
    layers,
    bands,
    context,
    notes,
    strip,
    ...(legend ? { legend } : {}),
    ...(sheet ? { sheet } : {}),
    width: sheet?.width ?? width,
    height: sheet?.height ?? (legend ? Math.max(strip.bottom + m.legendReserve, legend.bottom) : body + m.margin),
    placed: placedOf(spec, pl, routes, labels, numbered),
  };
}
