import { textWidth } from '@diagrist/core';
import type { EdgeText, GridColumn, GridGroup, GridMetrics, GridNode, GridSpec, Pads } from '@diagrist/layout-grid';
import type { Look } from '../looks/look.js';
import type { ArchEdge, ArchGroup, ArchitectureModel, ArchNode } from '../model/types.js';
import { signedLabel } from './diff.js';
import { fixedWidth, isCircle, isFigure, nodeHeight, nodeWidth, secondLine } from './measure.js';
import { tabStretch } from './tab.js';

const PERSON_W = 40;
const PERSON_TEXT_PAD = 16;
const TAG_MIN_W = 120;
const HEADING_GROW = 4;

/** Second line of an edge label: protocol, schedule, volume and promise, in this order, where given. */
export const detailLine = (e: ArchEdge): string => [e.via, e.schedule, e.volume, e.sla].filter(Boolean).join(' · ');

/** Width of a tag such as `CLOSED` at the right of a frame. */
export const tagWidth = (tag: string, look: Look): number =>
  Math.max(TAG_MIN_W, textWidth(tag, look.fonts.name) + 2 * look.metrics.nodePad);

/** Font size of titles on the side and on cards: a bit larger than a group head. */
export const headingSize = (look: Look): number => look.fonts.group.size + HEADING_GROW;

/** Pads of a frame: room for the head on top, a side title on the left, a tag on the right. */
function pads(g: ArchGroup, model: ArchitectureModel, look: Look): Pads {
  const m = look.metrics;
  const titled = g.title !== '' && g.heading !== 'side';
  const sides = model.groups.filter((s) => s.heading === 'side' && s.title !== '');
  const side = Math.max(0, ...sides.map((s) => textWidth(s.title, look.fonts.heading)));
  return {
    top: titled ? m.groupPadTop : m.groupPadBottom,
    bottom: m.groupPadBottom,
    left: m.groupPadX + (g.heading === 'side' ? side + m.groupPadX : 0),
    right: m.groupPadX + (g.tag ? tagWidth(g.tag, look) + m.groupPadX : 0),
  };
}

/** A column of only people is as wide as their longest text, at least `personW`. */
function column(name: string, model: ArchitectureModel, look: Look): GridColumn {
  const { metrics: m, fonts } = look;
  const people = model.nodes.filter((n) => isFigure(n, look) && n.at?.col === name);
  const others = model.nodes.some((n) => !isFigure(n, look) && n.at?.col === name);
  if (people.length === 0 || others) return { name };
  const texts = people.flatMap((n) => [
    textWidth(n.label, fonts.name),
    n.tech ? textWidth(n.tech, secondLine(n, fonts)) : 0,
  ]);
  return { name, width: Math.max(m.personW, Math.ceil((Math.max(0, ...texts) + PERSON_TEXT_PAD) / m.grid) * m.grid) };
}

/** The radius of the icon circle a card wears on the middle of its top edge, or 0. */
export const crestOf = (n: ArchNode, look: Look): number =>
  look.options.nodes === 'card' && n.icon && !isCircle(n, look) && !isFigure(n, look) ? look.metrics.cardIconR : 0;

/**
 * The stretches of a node's sides no edge docks on: the name in the top edge with `nodeName: tab`, and below a card's
 * icon circle, there in an adaptive grid only, as the predecessor kept it free (docs/burn-down.md).
 */
function reserveOf(n: ArchNode, adaptive: boolean, look: Look): GridNode['reserve'] {
  const tab = tabStretch(n, look);
  if (tab) return { top: tab };
  const crest = crestOf(n, look);
  return crest > 0 && adaptive ? { top: { from: -crest, to: crest, origin: 'middle' } } : undefined;
}

function gridNode(n: ArchNode, at: NonNullable<ArchNode['at']>, adaptive: boolean, look: Look): GridNode {
  const { metrics: m, fonts } = look;
  const reserve = reserveOf(n, adaptive, look);
  const circle = isCircle(n, look);
  const own = look.options.nodes === 'block' || n.height !== undefined ? nodeHeight(n, look) : undefined;
  const fixed = adaptive ? fixedWidth(n, look) : undefined;
  const width = isFigure(n, look) ? PERSON_W : circle ? 2 * m.circleR : fixed;
  const measured = nodeWidth(n, look);
  const demand =
    fixed !== undefined
      ? { width: fixed, exact: true }
      : circle
        ? { width: measured, exact: true }
        : { width: Math.max(m.nodeW, measured), exact: false };
  const tech = n.tech ? textWidth(n.tech, secondLine(n, fonts)) : 0;
  const caption = { w: Math.max(textWidth(n.label, fonts.name), tech), below: fonts.name.size + 10 };
  return {
    id: n.id,
    col: at.col,
    row: at.row,
    ...(n.span ? { to: { col: n.span.col, ...(n.span.row ? { row: n.span.row } : {}) } } : {}),
    ...(n.slot ? { slot: n.slot } : {}),
    ...(width !== undefined ? { width } : {}),
    ...(own !== undefined && !circle ? { height: own } : {}),
    rowHeight: nodeHeight(n, look),
    demand,
    shape: circle ? 'circle' : 'box',
    ...(circle ? { caption: { ...caption, below: caption.below + (n.tech ? m.nodeLineH : 0) } } : {}),
    ...(reserve ? { reserve } : {}),
    source: n.source,
  };
}

function gridGroup(g: ArchGroup, model: ArchitectureModel, look: Look): GridGroup {
  return {
    id: g.id,
    ...(g.parent ? { parent: g.parent } : {}),
    members: g.members,
    pads: pads(g, model, look),
    ...(g.cover ? { cover: g.cover } : {}),
    source: g.source,
  };
}

/** Where the grid starts: the top of its first row, and the room left of it besides the margin. */
export interface GridStart {
  readonly firstRowY: number;
  readonly indent: number;
}

/** The measures `layout-grid` takes; the icon circle of a card on the top edge overhangs its row. */
function gridMetricsOf({ metrics: m, fonts, options }: Look, start: GridStart): GridMetrics {
  return {
    grid: m.grid,
    nodeW: m.nodeW,
    nodeH: m.nodeH,
    colGap: m.colGap,
    subColGap: m.subColGap,
    rowGap: m.rowGap,
    marginX: m.marginX,
    firstRowY: start.firstRowY,
    ...(start.indent > 0 ? { indent: start.indent } : {}),
    margin: m.margin,
    laneGap: m.laneGap,
    portSpread: m.portSpread,
    loopReach: m.loopReach,
    framePad: { top: m.groupPadTop, bottom: m.groupPadBottom, x: m.groupPadX },
    labelFont: fonts.label,
    labelLineH: m.labelLineH,
    labelGap: m.labelGap,
    rowOverhang: options.nodes === 'card' ? m.cardIconR : 0,
  };
}

/**
 * The grid of a model as `layout-grid` takes it, starting where `start` says, and the texts of its edges; edge ids
 * are their indices.
 */
export function gridSpecOf(
  model: ArchitectureModel,
  look: Look,
  start: GridStart = { firstRowY: look.metrics.firstRowY, indent: 0 },
): { spec: GridSpec; texts: EdgeText[] } {
  const nodes = model.nodes.flatMap((n) => (n.at ? [gridNode(n, n.at, model.adaptive, look)] : []));
  const edges = model.edges.map((e) => ({
    id: String(e.index),
    from: e.from,
    to: e.to,
    ...(e.bundle ? { bundle: e.bundle } : {}),
    ...(e.lane ? { lane: e.lane } : {}),
    source: e.source,
  }));
  const texts = model.edges.map((e): EdgeText => {
    const detail = detailLine(e);
    const name = signedLabel(e.label, e.origin);
    return {
      edge: String(e.index),
      ...(name ? { name } : {}),
      ...(detail ? { detail } : {}),
      accent: e.step?.accent === true,
    };
  });
  const spec: GridSpec = {
    cols: model.cols.map((name) => column(name, model, look)),
    rows: model.rows.map((name) => ({ name })),
    nodes,
    groups: model.groups.map((g) => gridGroup(g, model, look)),
    edges,
    metrics: gridMetricsOf(look, start),
    adaptive: model.adaptive,
  };
  return { spec, texts };
}
