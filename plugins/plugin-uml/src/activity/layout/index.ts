import { type Placed, textWidth } from '@diagrist/core';
import { decisionStrip, HEADER, type Header, MARGIN, type Strip, stripWidth, type Words } from '@diagrist/parts';
import type { ActivityModel } from '../model/index.js';
import { layoutGraph } from './graph.js';
import { type GuardText, guardTexts, placeQuestions } from './guards.js';
import type { LaneArt } from './lanes.js';
import { ACT, ACT_FONTS, right, widthOf } from './metrics.js';
import { placePins } from './pins.js';
import { type PlacedNode, placeActivity } from './place.js';
import { placedOf } from './placed.js';
import { nameRegions } from './region-names.js';
import type { ActivityText, RegionArt } from './regions.js';
import { type Routed, routeActivity } from './route.js';

/** The texts of the picture the layout measures: the title line, and the suffix of open decisions. */
export type PictureTexts = Pick<Words, 'open'> & {
  /** Title line: kind and title, such as `Activity diagram (UML) · Order`. */
  readonly title: string;
};

/** A decision mark at the top right corner of a node. */
export interface MarkSpot {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

/** Everything the scene draws, in picture pixels. */
export interface ActivityLayout {
  readonly header: Header;
  readonly width: number;
  readonly height: number;
  readonly lanes: readonly LaneArt[];
  readonly regions: readonly RegionArt[];
  readonly nodes: readonly PlacedNode[];
  readonly routes: readonly Routed[];
  readonly guards: readonly GuardText[];
  readonly marks: readonly MarkSpot[];
  readonly strip: Strip;
  /** What was placed, for the kernel's placement check. */
  readonly placed: readonly Placed[];
}

/** A text that hangs on a node or region instead of an edge, with the key the placement check names it by. */
export interface SideText {
  readonly key: string;
  readonly text: ActivityText;
}

/** Texts that hang on nodes and regions instead of edges: question, time, pin names, region names. */
function sideTexts(nodes: readonly PlacedNode[], regions: readonly RegionArt[]): SideText[] {
  return [
    ...nodes.flatMap((p) => [
      ...(p.art.side ? [{ key: `${p.id}.text`, text: p.art.side }] : []),
      ...(p.art.pins ?? []).map((pin, i) => ({ key: `${p.id}.pin.${i + 1}.name`, text: pin.text })),
    ]),
    ...regions.flatMap((r) =>
      [...(r.name ? [r.name] : []), ...(r.more ?? [])].map((text, i) => ({ key: `${r.id}.name.${i + 1}`, text })),
    ),
  ];
}

/** Right edge of a text of the label size. */
const textRight = (t: ActivityText): number => {
  const w = widthOf.label(t.text);
  return t.anchor === 'start' ? t.x + w : t.anchor === 'end' ? t.x : t.x + w / 2;
};

/**
 * Layout of an activity diagram: layers and order from the layering, lanes as columns, its own routing with bars,
 * diamonds and loops, then pins, questions, guards and region names; then the sheet around title, picture and
 * decision bar.
 */
export function layoutActivity(m: ActivityModel, words: PictureTexts): ActivityLayout {
  const g = layoutGraph(m);
  const ap = placeActivity(g);
  const routed = routeActivity(g, ap);
  const pinned = placePins(placeQuestions(ap.placement, routed), routed, g);
  const routes = pinned.routes;
  const guards = guardTexts(routes);
  const nodes = [...pinned.placement.nodes.values()];
  const regions = nameRegions(ap.regions, routes, pinned.placement);
  const side = sideTexts(nodes, regions);
  const width = Math.ceil(
    Math.max(
      ap.placement.width,
      ...[...guards, ...side.map((t) => t.text)].map((t) => textRight(t) + ACT.marginX),
      ...ap.regions.map((r) => right(r.rect) + ACT.marginX),
      textWidth(words.title, ACT_FONTS.title) + 2 * MARGIN,
      stripWidth(m.diagram.decisions, words.open),
    ),
  );
  const body = Math.max(ap.placement.bodyBottom, ...routes.flatMap((r) => r.points.map((p) => p[1])));
  const strip = decisionStrip(m.diagram.decisions, body, width);
  const marks = nodes.flatMap((p) => (p.node.mark ? [{ id: p.node.mark, x: right(p.rect), y: p.rect.y }] : []));
  const height = Math.ceil((strip.cards.length > 0 ? strip.bottom : body) + ACT.margin);
  return {
    header: HEADER,
    width,
    height,
    lanes: ap.lanes,
    regions,
    nodes,
    routes,
    guards,
    marks,
    strip,
    placed: placedOf({ lanes: ap.lanes, regions, nodes, guards, side }, m.diagram),
  };
}
