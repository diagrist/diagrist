import type { EdgeLabel, GridLayout, GridSpec, PlacedGroup, Route } from '@diagrist/layout-grid';
import { layoutGraph } from '@diagrist/layout-grid';
import { frameOf, type StateModel } from '../model.js';
import { stateGraph } from './graph.js';
import { edgeId } from './ids.js';
import { labelLines } from './labels.js';
import { STATE as S, stateMetrics } from './metrics.js';
import type { RouteContext } from './transitions.js';

/** A laid out state machine: the spec it was placed by, the grid the scene reads, routes and texts in source order. */
export interface Laid {
  readonly spec: GridSpec;
  readonly grid: GridLayout;
  readonly routes: readonly Route[];
  readonly labels: readonly EdgeLabel[];
  readonly context: RouteContext;
  /** The orthogonal regions as the layout filled their states with them. */
  readonly regions: readonly PlacedGroup[];
}

/** Lays a state machine out by `layoutGraph` and hands the picture on as the rest of the kind reads it. */
export function laidState(m: StateModel): Laid {
  const graph = stateGraph(m);
  const layout = layoutGraph(graph);
  const grid: GridLayout = {
    cols: [],
    rows: [],
    gutters: { cols: [], rows: [] },
    nodes: layout.nodes,
    groups: (layout.frames ?? []).filter((f) => m.kind(f.id) !== 'region'),
    width: layout.width + S.marginX,
    bottom: layout.bottom + S.padBottom,
  };
  const byEdge = new Map(layout.routes.map((r, i) => [r.edge, i]));
  const items = m.diagram.transitions.flatMap((t, i) => {
    const at = byEdge.get(edgeId(i));
    return at === undefined ? [] : [{ t, i, at }];
  });
  const moved = new Map(items.map((x, k) => [x.at, k]));
  const routes = items.flatMap((x) => layout.routes[x.at] ?? []);
  const labels = layout.labels.flatMap((l) => {
    const at = moved.get(l.route);
    return at === undefined ? [] : [{ ...l, route: at }];
  });
  const spec: GridSpec = {
    cols: [{ name: 'c' }],
    rows: [{ name: 'r' }],
    nodes: graph.nodes.map((n) => ({
      id: n.id,
      col: 'c',
      row: 'r',
      width: n.width,
      height: n.height,
      ...(n.shape === 'ellipse' ? { shape: n.shape } : {}),
      ...(n.source ? { source: n.source } : {}),
    })),
    groups: (graph.containers ?? [])
      .filter((c) => c.kind !== 'part')
      .map((c) => ({
        id: c.id,
        members: graph.nodes.flatMap((n) => (frameOf(m, m.vertices.get(n.id)?.parent) === c.id ? [n.id] : [])),
        pads: { top: 0, bottom: 0, left: 0, right: 0 },
        ...(c.parent === undefined ? {} : { parent: c.parent }),
        ...(m.vertices.get(c.id)?.span ? { source: m.vertices.get(c.id)?.span } : {}),
      })),
    edges: items.map(({ t, i }) => ({ id: edgeId(i), from: t.from, to: t.to, source: t.span })),
    metrics: stateMetrics(64),
    adaptive: true,
  };
  const context: RouteContext = {
    m,
    grid,
    ends: items.map(({ t }) => ({
      from: t.from,
      to: t.to,
      ...(t.emph ? { emph: true } : {}),
      ...(t.area === undefined ? {} : { area: t.area }),
      span: t.span,
    })),
    lines: items.map(({ t }) => labelLines(t, m.diagram.protocol)),
  };
  const regions = (layout.frames ?? []).filter((f) => m.kind(f.id) === 'region');
  return { spec, grid, routes, labels, context, regions };
}
