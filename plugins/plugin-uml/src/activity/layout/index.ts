import { type Placed, textWidth } from '@diagrist/core';
import { right } from '@diagrist/layout-grid';
import { decisionStrip, HEADER, type Header, MARGIN, type Strip, stripWidth, type Words } from '@diagrist/parts';
import type { ActivityModel } from '../model/index.js';
import { layoutGraph } from './graph.js';
import type { GuardText } from './guards.js';
import type { LaneArt } from './lanes.js';
import { ACT, ACT_FONTS, widthOf } from './metrics.js';
import { laidWithPins } from './pin-reach.js';
import { placedOf } from './placed.js';
import type { PlacedNode, Routed } from './placement.js';
import { nameRegions } from './region-names.js';
import type { ActivityText, RegionArt } from './regions.js';

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
 * Layout of an activity diagram: laid out by the layout engine (`laidActivity`), then the questions beside their
 * diamonds, the pins on their actions and the names of the regions, and the sheet around title, picture and decision
 * bar.
 */
export function layoutActivity(m: ActivityModel, words: PictureTexts): ActivityLayout {
  const g = layoutGraph(m);
  const { laid, placement, routes } = laidWithPins(g);
  const guards = laid.guards;
  const nodes = [...placement.nodes.values()];
  const regions = nameRegions(laid.regions, routes, placement);
  const side = sideTexts(nodes, regions);
  const width = Math.ceil(
    Math.max(
      laid.right + ACT.marginX,
      ...[...guards, ...side.map((t) => t.text)].map((t) => textRight(t) + ACT.marginX),
      ...regions.map((r) => right(r.rect) + ACT.marginX),
      textWidth(words.title, ACT_FONTS.title) + 2 * MARGIN,
      stripWidth(m.diagram.decisions, words.open),
    ),
  );
  const body = Math.max(laid.bottom, ...routes.flatMap((r) => r.points.map((p) => p[1])));
  const strip = decisionStrip(m.diagram.decisions, body, width);
  const marks = nodes.flatMap((p) => (p.node.mark ? [{ id: p.node.mark, x: right(p.rect), y: p.rect.y }] : []));
  const height = Math.ceil((strip.cards.length > 0 ? strip.bottom : body) + ACT.margin);
  return {
    header: HEADER,
    width,
    height,
    lanes: laid.lanes,
    regions,
    nodes,
    routes,
    guards,
    marks,
    strip,
    placed: placedOf({ lanes: laid.lanes, regions, nodes, guards, side }, m.diagram),
  };
}
