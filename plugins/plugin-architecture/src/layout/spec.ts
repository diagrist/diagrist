import { textWidth } from '@diagrist/core';
import type {
  GraphCell,
  GraphCells,
  GraphEdge,
  GraphNode,
  GridColumn,
  GridNode,
  LayoutGraph,
} from '@diagrist/layout-grid';
import type { Look } from '../looks/look.js';
import type { ArchitectureModel, ArchNode } from '../model/types.js';
import type { Texts } from '../texts/index.js';
import { frameOf, type Head } from './frame-cell.js';
import { type GridStart, metricsOf } from './graph-metrics.js';
import { fixedWidth, isCircle, isFigure, nodeHeight, nodeWidth, secondLine } from './measure.js';
import { tabStretch } from './tab.js';

const PERSON_W = 40;
const PERSON_TEXT_PAD = 16;
const HEADING_GROW = 4;

interface Placement {
  readonly node: GraphNode;
  readonly cell: GraphCell;
}

/** Font size of titles on the side and on cards: a bit larger than a group head. */
export const headingSize = (look: Look): number => look.fonts.group.size + HEADING_GROW;

/**
 * A column of only people is as wide as their longest text, at least `personW`. In a fixed grid a column holding
 * boxes is as wide as the widest box alone in its place needs for its texts, at least `nodeW`, so no text runs past
 * the right edge of its box; an adaptive grid asks its nodes itself (`demand`).
 */
function column(name: string, model: ArchitectureModel, look: Look, words: Texts): GridColumn {
  const { metrics: m, fonts } = look;
  const people = model.nodes.filter((n) => isFigure(n, look) && n.at?.col === name);
  const others = model.nodes.filter((n) => !isFigure(n, look) && n.at?.col === name);
  if (people.length === 0 || others.length > 0) {
    const alone = others.filter(
      (n) =>
        !model.adaptive && !n.slot && n.width === undefined && !isCircle(n, look) && (n.span?.col ?? name) === name,
    );
    const widest = Math.max(m.nodeW, ...alone.map((n) => nodeWidth(n, look, words.statusInBox)));
    return widest > m.nodeW ? { name, width: widest } : { name };
  }
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
 * icon circle.
 */
function reserveOf(n: ArchNode, look: Look): GridNode['reserve'] {
  const tab = tabStretch(n, look);
  if (tab) return { top: tab };
  const crest = crestOf(n, look);
  return crest > 0 ? { top: { from: -crest, to: crest, origin: 'middle' } } : undefined;
}

/** A node of the model as a node of the layout graph, ellipse for a circle, and its cell in the author's grid. */
function cellOf(n: ArchNode, at: NonNullable<ArchNode['at']>, adaptive: boolean, look: Look): Placement {
  const { metrics: m, fonts } = look;
  const reserve = reserveOf(n, look);
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
  const node: GraphNode = {
    id: n.id,
    width: demand.width,
    height: nodeHeight(n, look),
    shape: circle ? 'ellipse' : 'box',
    ...(n.source ? { source: n.source } : {}),
  };
  const cell: GraphCell = {
    node: n.id,
    col: at.col,
    row: at.row,
    ...(n.span ? { to: { col: n.span.col, ...(n.span.row ? { row: n.span.row } : {}) } } : {}),
    ...(n.slot ? { slot: n.slot } : {}),
    ...(width !== undefined ? { width } : {}),
    ...(own !== undefined && !circle ? { height: own } : {}),
    ...(demand.exact ? { exact: true } : {}),
    ...(circle || isFigure(n, look)
      ? { caption: { ...caption, below: caption.below + (n.tech ? m.nodeLineH : 0) } }
      : {}),
    ...(reserve ? { reserve } : {}),
  };
  return { node, cell };
}

/**
 * The layout graph of a model in the author's grid, starting where `start` says, without its texts and signs, and
 * the heads of its frames by id; edge ids are their indices.
 */
export function graphOf(
  model: ArchitectureModel,
  look: Look,
  words: Texts,
  start: GridStart = { firstRowY: look.metrics.firstRowY, indent: 0 },
): { graph: Omit<LayoutGraph, 'given'>; cells: Omit<GraphCells, 'texts'>; heads: ReadonlyMap<string, Head> } {
  const placed = model.nodes.flatMap((n) => (n.at ? [cellOf(n, n.at, model.adaptive, look)] : []));
  const framed = model.groups.map((g) => frameOf(g, model, look, words));
  const edges = model.edges.map(
    (e): GraphEdge => ({
      id: String(e.index),
      from: e.from,
      to: e.to,
      rank: 'free',
      ...(e.bundle ? { bundle: e.bundle } : {}),
      ...(e.source ? { source: e.source } : {}),
    }),
  );
  const { metrics, cells: measures } = metricsOf(look, start);
  const graph = { nodes: placed.map((p) => p.node), edges, containers: framed.map((f) => f.container), metrics };
  const cells = {
    cols: model.cols.map((name) => column(name, model, look, words)),
    rows: model.rows.map((name) => ({ name })),
    cells: placed.map((p) => p.cell),
    frames: framed.map((f) => f.frame),
    lanes: model.edges.flatMap((e) => (e.lane ? [{ edge: String(e.index), col: e.lane }] : [])),
    adaptive: model.adaptive,
    metrics: measures,
  };
  return { graph, cells, heads: new Map(framed.flatMap((f) => (f.head ? [[f.container.id, f.head] as const] : []))) };
}
