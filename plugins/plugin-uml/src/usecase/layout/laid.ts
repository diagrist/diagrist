import {
  type EdgeLabel,
  type GridLayout,
  type GridNode,
  type GridSpec,
  layoutGraph,
  type PlacedNode,
  type Route,
} from '@diagrist/layout-grid';
import { isKnown } from '../diagram.js';
import type { UseCaseModel } from '../model.js';
import { actorSize } from './actor.js';
import type { Comment } from './art.js';
import type { Plan } from './auto/plan.js';
import { commentLabels } from './comment.js';
import { type Crowded, freeNotes } from './free.js';
import { useCaseGraph } from './graph.js';
import type { Anchors } from './links.js';
import { UC_GRID } from './metrics.js';
import { noteBoxes } from './note.js';
import { edgeId } from './spec.js';

/**
 * A laid out use case diagram: the spec the scene and the placement read, the grid, routes, texts and comments, and
 * the notes that found no free spot.
 */
export interface Laid {
  readonly spec: GridSpec;
  readonly layout: GridLayout;
  readonly routes: readonly Route[];
  readonly labels: readonly EdgeLabel[];
  readonly comments: readonly Comment[];
  readonly crowded: readonly Crowded[];
}

/** The model of a node as the scene and the placement check read it: an actor's figure with its role as caption. */
function gridNode(m: UseCaseModel, id: string, width: number, height: number, ellipse: boolean): GridNode {
  const a = m.actors.get(id);
  const size = a && actorSize(a);
  const source = (a ?? m.cases.get(id))?.span;
  return {
    id,
    col: 'c',
    row: 'r',
    width: size?.w ?? width,
    height: size?.h ?? height,
    ...(ellipse ? { shape: 'ellipse' as const } : {}),
    ...(size?.caption ? { caption: size.caption } : {}),
    ...(source ? { source } : {}),
  };
}

/**
 * Lays a use case diagram out by `layoutGraph` with the columns of `plan` and hands it on as the scene reads it, an
 * actor as its figure. Notes take free spots near their anchor once the picture stands (`freeNotes`); for those named
 * in `held` the graph keeps room as large as the note beside the anchor, as rows kept free did on the old grid. The
 * lines of an extend note are texts of its line. With `pack` the use cases of a subject close up in their columns.
 */
export function laidUseCase(m: UseCaseModel, plan: Plan, held: ReadonlySet<string> = new Set(), pack = false): Laid {
  const notes = noteBoxes(m);
  const graph = useCaseGraph(
    m,
    plan,
    notes.filter((n) => held.has(n.id)),
    pack,
  );
  const out = layoutGraph(graph);
  const ids = new Set(notes.map((n) => n.id));
  const models = new Map(
    graph.nodes
      .filter((n) => !ids.has(n.id))
      .map((n) => [
        n.id,
        gridNode(m, n.id, n.body?.width ?? n.width, n.body?.height ?? n.height, n.shape === 'ellipse'),
      ]),
  );
  const nodes = out.nodes.flatMap((p): PlacedNode[] => {
    const model = models.get(p.id);
    if (!model) return [];
    const [w, h] = [model.width ?? p.rect.w, model.height ?? p.rect.h];
    return [{ ...p, rect: { x: p.rect.x + (p.rect.w - w) / 2, y: p.rect.y, w, h } }];
  });
  const groups = out.frames ?? [];
  const layout: GridLayout = {
    cols: [],
    rows: [],
    gutters: { cols: [], rows: [] },
    nodes,
    groups,
    width: out.width + UC_GRID.marginX,
    bottom: out.bottom + UC_GRID.margin,
  };
  const routes = out.routes;
  const byEdge = new Map(routes.map((r, i) => [r.edge, i]));
  const anchors: Anchors = {
    node: (id) => {
      const placed = nodes.find((p) => p.id === id);
      const model = models.get(id);
      return placed && { placed, ...(model ? { model } : {}) };
    },
    frame: (id) => groups.find((g) => g.id === id),
    route: (i) => byEdge.get(edgeId(i)),
    routes,
  };
  const spec: GridSpec = {
    cols: [{ name: 'c', width: 0 }],
    rows: [{ name: 'r' }],
    nodes: [...models.values()],
    groups: (graph.containers ?? []).map((c) => ({
      id: c.id,
      members: c.members.filter((id) => models.has(id)),
      pads: { top: 0, bottom: 0, left: 0, right: 0 },
      ...(m.subjects.get(c.id)?.span ? { source: m.subjects.get(c.id)?.span } : {}),
    })),
    edges: m.diagram.relations.flatMap((r, i) =>
      isKnown(r) ? [{ id: edgeId(i), from: r.from, to: r.to, source: r.span }] : [],
    ),
    metrics: UC_GRID,
    adaptive: true,
  };
  const base = { spec, layout, routes, labels: out.labels };
  const free = freeNotes(m, base, notes, anchors);
  const comments = free.comments.map((x) => x.c);
  return { ...base, labels: [...base.labels, ...comments.flatMap(commentLabels)], comments, crowded: free.crowded };
}
