import type { GraphEdge, GraphNode, LayoutGraph } from './spec.js';

/** A docked node and the frame or node it sits on. */
export interface Dock {
  readonly node: GraphNode;
  readonly host: string;
  /** The host is a frame, so lines may run into it; else a box. */
  readonly framed: boolean;
}

/** How the edges of docked nodes were laid out, for `placeDocks` to cut them back apart. */
export interface DockPlan {
  readonly docks: ReadonlyMap<string, Dock>;
  /** One edge through a docked node: the line into it and the line out of it, laid out as one. */
  readonly merged: ReadonlyMap<string, { readonly into: GraphEdge; readonly out: GraphEdge; readonly dock: string }>;
  /** An edge laid out to the host instead of the docked node at one end or both: the docked node at each. */
  readonly hosted: ReadonlyMap<string, { readonly from?: string; readonly to?: string }>;
  /** The one edge of a docked node inside its frame, laid out beside the node it joins, the node in the frame. */
  readonly beside: ReadonlyMap<string, string>;
}

/** The nodes inside each frame, directly or in a frame inside it. */
function inside(graph: LayoutGraph): Map<string, Set<string>> {
  const containers = graph.containers ?? [];
  const parent = new Map(containers.map((c) => [c.id, c.parent]));
  const out = new Map<string, Set<string>>(containers.map((c) => [c.id, new Set()]));
  for (const c of containers)
    for (const n of c.members)
      for (let f: string | undefined = c.id, k = 0; f !== undefined && k <= containers.length; f = parent.get(f), k++)
        out.get(f)?.add(n);
  return out;
}

/**
 * The graph the stages lay out for nodes docked on an outline (layout plan P8). A line through a docked node, one
 * into it from one side of the outline and one out of it to the other, is laid out as one edge from start to end and
 * cut where it crosses the outline; where several run in or out, each pairs with the first of the other side. An edge
 * that does not cross, from outside to the docked node or from it to outside, runs to the host instead and ends on
 * its outline, edges of one docked node on one trunk. The one edge of a docked node with no line outside, inside a
 * frame, runs beside the node it joins, the docked node standing in the frame until `placeDocks` moves it out to the
 * outline. A line through is laid out with the text of its first part, else of its second, so the stages keep room
 * for it; `placeDocks` seats the texts of both parts anew once it is cut.
 */
export function dockGraph(graph: LayoutGraph): { readonly graph: LayoutGraph; readonly plan: DockPlan } {
  const docked = graph.nodes.filter((n) => n.dock !== undefined);
  const empty: DockPlan = { docks: new Map(), merged: new Map(), hosted: new Map(), beside: new Map() };
  if (docked.length === 0) return { graph, plan: empty };
  const frames = new Set((graph.containers ?? []).map((c) => c.id));
  const within = inside(graph);
  const docks = new Map(
    docked.map((n): [string, Dock] => [
      n.id,
      { node: n, host: n.dock as string, framed: frames.has(n.dock as string) },
    ]),
  );
  const merged = new Map<string, { into: GraphEdge; out: GraphEdge; dock: string }>();
  const hosted = new Map<string, { from?: string; to?: string }>();
  const beside = new Map<string, string>();
  const kept = new Set<string>();
  let edges: GraphEdge[] = [...graph.edges];
  for (const [id, d] of docks) {
    const inner = (other: string) => d.framed && (within.get(d.host)?.has(other) ?? false);
    const into = edges.filter((e) => e.to === id && e.from !== id);
    const out = edges.filter((e) => e.from === id && e.to !== id);
    const outside = inner(into[0]?.from ?? '');
    const crossing =
      into.length > 0 &&
      out.length > 0 &&
      into.every((e) => inner(e.from) === outside) &&
      out.every((e) => inner(e.to) !== outside);
    if (crossing) {
      const pairs = [
        ...into.map((i) => [i, out[0] as GraphEdge] as const),
        ...out.slice(1).map((o) => [into[0] as GraphEdge, o] as const),
      ];
      const through = pairs.map(([i, o]): GraphEdge => {
        const key = `${i.id}>${o.id}`;
        merged.set(key, { into: i, out: o, dock: id });
        const label = i.label ?? o.label;
        const { label: _, ...rest } = i;
        return { ...rest, id: key, to: o.to, ...(label ? { label } : {}) };
      });
      const gone = new Set([...into, ...out].map((e) => e.id));
      const at = edges.findIndex((e) => gone.has(e.id));
      edges = [
        ...edges.slice(0, at).filter((e) => !gone.has(e.id)),
        ...through,
        ...edges.slice(at).filter((e) => !gone.has(e.id)),
      ];
      continue;
    }
    const all = [...into, ...out];
    const lone = all.length === 1 && all[0] !== undefined ? all[0] : undefined;
    if (lone && inner(lone.from === id ? lone.to : lone.from)) {
      beside.set(lone.id, id);
      kept.add(id);
      edges = edges.map((e) => (e.id === lone.id ? { ...e, rank: 'beside' } : e));
      continue;
    }
    const ids = new Set(all.map((e) => e.id));
    const trunk = all.length > 1 ? { bundle: `dock:${id}` } : {};
    edges = edges.map((e) => {
      if (!ids.has(e.id)) return e;
      const end = e.from === id ? 'from' : 'to';
      hosted.set(e.id, { ...hosted.get(e.id), [end]: id });
      return { ...e, [end]: d.host, ...trunk };
    });
  }
  const containers = (graph.containers ?? []).map((c) => {
    const members = c.members.filter((n) => !docks.has(n) || kept.has(n));
    const add = [...kept].filter((id) => docks.get(id)?.host === c.id && !members.includes(id));
    return { ...c, members: [...members, ...add] };
  });
  const nodes = graph.nodes.flatMap((n) => {
    if (!docks.has(n.id)) return [n];
    const { dock: _, ...free } = n;
    return kept.has(n.id) ? [free] : [];
  });
  return {
    graph: { ...graph, nodes, edges, ...(graph.containers ? { containers } : {}) },
    plan: { docks, merged, hosted, beside },
  };
}
