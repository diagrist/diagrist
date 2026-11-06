import type { GridEdge, GridGroup, GridMetrics, GridNode, GridSpec } from '../spec.js';
import type { CellGraph } from './cells.js';

/** The measures of the grid: the graph's gaps, tracks, port gap, lead, label gap and corner, the cells' rest. */
function metricsOf(graph: CellGraph): GridMetrics {
  const m = graph.metrics;
  return {
    ...graph.given.cells.metrics,
    colGap: m.colGap,
    rowGap: m.rowGapMin,
    laneGap: m.track,
    portSpread: m.portGap,
    lead: m.lead,
    labelGap: m.labelGap,
    marginX: m.left,
    firstRowY: m.top,
  };
}

/**
 * A layout graph with the author's cells as the spec of the grid: every node with a cell in it, every frame with the
 * sides and head its cell gives, every edge with the column it keeps to, routed through the channels.
 */
export function gridSpecOf(graph: CellGraph): GridSpec {
  const given = graph.given.cells;
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
  const frames = new Map((given.frames ?? []).map((f) => [f.frame, f]));
  const lanes = new Map((given.lanes ?? []).map((l) => [l.edge, l.col]));
  const gridNodes = given.cells.flatMap(({ node, exact, ...cell }): GridNode[] => {
    const n = nodes.get(node);
    if (!n) return [];
    return [
      {
        id: n.id,
        ...cell,
        rowHeight: n.height,
        demand: { width: n.width, exact: exact === true },
        shape: n.shape === 'ellipse' ? 'circle' : 'box',
        ...(n.source ? { source: n.source } : {}),
      },
    ];
  });
  const groups = (graph.containers ?? []).map((c): GridGroup => {
    const f = frames.get(c.id);
    const head = f?.head;
    return {
      id: c.id,
      ...(c.parent === undefined ? {} : { parent: c.parent }),
      members: c.members,
      pads: { top: c.top, bottom: c.pad, left: f?.left ?? c.pad, right: f?.right ?? c.pad },
      ...(f?.cover ? { cover: f.cover } : {}),
      ...(head ? { head: { ...head, w: c.head.width, h: c.head.height } } : {}),
      ...(f?.source ? { source: f.source } : {}),
    };
  });
  const edges = graph.edges.map((e): GridEdge => {
    const lane = lanes.get(e.id);
    return {
      id: e.id,
      from: e.from,
      to: e.to,
      ...(e.bundle ? { bundle: e.bundle } : {}),
      ...(lane ? { lane } : {}),
      ...(e.source ? { source: e.source } : {}),
    };
  });
  return {
    cols: given.cols,
    rows: given.rows,
    nodes: gridNodes,
    groups,
    edges,
    metrics: metricsOf(graph),
    adaptive: given.adaptive,
    channels: true,
    drops: given.adaptive,
  };
}
