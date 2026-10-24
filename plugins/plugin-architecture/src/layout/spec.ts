import type { EdgeText, GridColumn, GridGroup, GridMetrics, GridNode, GridSpec, Pads } from '@diagrist/layout-grid';
import type { ArchEdge, ArchGroup, ArchitectureModel, ArchNode } from '../model/types.js';
import { fixedWidth, isCircle, nodeHeight, nodeWidth, type Sizing } from './measure.js';
import { measure } from './metrics.js';

const PERSON_W = 40;
const PERSON_TEXT_PAD = 16;
const TAG_MIN_W = 120;
const HEADING_GROW = 4;

/** Second line of an edge label: protocol, schedule, volume and promise, in this order, where given. */
export const detailLine = (e: ArchEdge): string => [e.via, e.schedule, e.volume, e.sla].filter(Boolean).join(' · ');

/** Width of a tag such as `CLOSED` at the right of a frame. */
export const tagWidth = (tag: string, { m }: Sizing): number =>
  Math.max(TAG_MIN_W, measure(tag, m.fontSize.node, true) + 2 * m.nodePad);

/** Font size of titles on the side and on cards: a bit larger than a group head. */
export const headingSize = ({ m }: Sizing): number => m.fontSize.group + HEADING_GROW;

/** Pads of a frame: room for the head on top, a side title on the left, a tag on the right. */
function pads(g: ArchGroup, model: ArchitectureModel, sizing: Sizing): Pads {
  const m = sizing.m;
  const titled = g.title !== '' && g.heading !== 'side';
  const sides = model.groups.filter((s) => s.heading === 'side' && s.title !== '');
  const side = Math.max(0, ...sides.map((s) => measure(s.title, headingSize(sizing), true)));
  return {
    top: titled ? m.groupPadTop : m.groupPadBottom,
    bottom: m.groupPadBottom,
    left: m.groupPadX + (g.heading === 'side' ? side + m.groupPadX : 0),
    right: m.groupPadX + (g.tag ? tagWidth(g.tag, sizing) + m.groupPadX : 0),
  };
}

/** A column of only people is as wide as their longest text, at least `personW`. */
function column(name: string, model: ArchitectureModel, { m }: Sizing): GridColumn {
  const people = model.nodes.filter((n) => n.keyword === 'person' && n.at?.col === name);
  const others = model.nodes.some((n) => n.keyword !== 'person' && n.at?.col === name);
  if (people.length === 0 || others) return { name };
  const texts = people.flatMap((n) => [
    measure(n.label, m.fontSize.node, true),
    n.tech ? measure(n.tech, m.fontSize.note) : 0,
  ]);
  return { name, width: Math.max(m.personW, Math.ceil((Math.max(0, ...texts) + PERSON_TEXT_PAD) / m.grid) * m.grid) };
}

function gridNode(n: ArchNode, at: NonNullable<ArchNode['at']>, adaptive: boolean, sizing: Sizing): GridNode {
  const { look, m } = sizing;
  const circle = isCircle(n, look);
  const own = look === 'blocks' || n.height !== undefined ? nodeHeight(n, sizing) : undefined;
  const fixed = adaptive ? fixedWidth(n, sizing) : undefined;
  const width = n.keyword === 'person' ? PERSON_W : circle ? 2 * m.circleR : fixed;
  const measured = nodeWidth(n, sizing);
  const demand =
    fixed !== undefined
      ? { width: fixed, exact: true }
      : circle
        ? { width: measured, exact: true }
        : { width: Math.max(m.nodeW, measured), exact: false };
  const tech = n.tech ? measure(n.tech, m.fontSize.note) : 0;
  const caption = { w: Math.max(measure(n.label, m.fontSize.node, true), tech), below: m.fontSize.node + 10 };
  return {
    id: n.id,
    col: at.col,
    row: at.row,
    ...(n.span ? { to: { col: n.span.col, ...(n.span.row ? { row: n.span.row } : {}) } } : {}),
    ...(n.slot ? { slot: n.slot } : {}),
    ...(width !== undefined ? { width } : {}),
    ...(own !== undefined && !circle ? { height: own } : {}),
    rowHeight: nodeHeight(n, sizing),
    demand,
    shape: circle ? 'circle' : 'box',
    ...(circle ? { caption: { ...caption, below: caption.below + (n.tech ? m.nodeLineH : 0) } } : {}),
    ...(look === 'cards' && n.icon && !circle && n.keyword !== 'person' ? { crest: m.cardIconR } : {}),
    source: n.source,
  };
}

function gridGroup(g: ArchGroup, model: ArchitectureModel, sizing: Sizing): GridGroup {
  return {
    id: g.id,
    ...(g.parent ? { parent: g.parent } : {}),
    members: g.members,
    pads: pads(g, model, sizing),
    ...(g.cover ? { cover: g.cover } : {}),
    source: g.source,
  };
}

function metricsOf({ look, m }: Sizing): GridMetrics {
  return {
    grid: m.grid,
    nodeW: m.nodeW,
    nodeH: m.nodeH,
    colGap: m.colGap,
    subColGap: m.subColGap,
    rowGap: m.rowGap,
    marginX: m.marginX,
    firstRowY: m.firstRowY,
    margin: m.margin,
    laneGap: m.laneGap,
    portSpread: m.portSpread,
    loopReach: m.loopReach,
    framePad: { top: m.groupPadTop, bottom: m.groupPadBottom, x: m.groupPadX },
    labelFont: { size: m.fontSize.label },
    labelLineH: m.labelLineH,
    labelGap: m.labelGap,
    rowOverhang: look === 'cards' ? m.cardIconR : 0,
  };
}

/** The grid of a model as `layout-grid` takes it, and the texts of its edges; edge ids are their indices. */
export function gridSpecOf(model: ArchitectureModel, sizing: Sizing): { spec: GridSpec; texts: EdgeText[] } {
  const nodes = model.nodes.flatMap((n) => (n.at ? [gridNode(n, n.at, model.adaptive, sizing)] : []));
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
    return {
      edge: String(e.index),
      ...(e.label ? { name: e.label } : {}),
      ...(detail ? { detail } : {}),
      accent: e.step?.accent === true,
    };
  });
  const spec: GridSpec = {
    cols: model.cols.map((name) => column(name, model, sizing)),
    rows: model.rows.map((name) => ({ name })),
    nodes,
    groups: model.groups.map((g) => gridGroup(g, model, sizing)),
    edges,
    metrics: metricsOf(sizing),
    adaptive: model.adaptive,
  };
  return { spec, texts };
}
