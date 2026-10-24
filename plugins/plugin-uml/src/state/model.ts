import type { StateDiagram, Transition, Vertex, VertexKind } from './diagram.js';

/** The diagram with its vertices by id and the structure rules, layout and description look up. */
export interface StateModel {
  readonly diagram: StateDiagram;
  readonly vertices: ReadonlyMap<string, Vertex>;
  /** States with substates or regions; they become frames. Entry and exit points alone make none. */
  readonly composites: ReadonlySet<string>;
  out(id: string): readonly Transition[];
  into(id: string): readonly Transition[];
  kind(id: string): VertexKind | undefined;
}

/** Entry and exit points sit on the border of their state, not in a layer. */
export const isBorderPoint = (kind: VertexKind | undefined): boolean => kind === 'entrypoint' || kind === 'exitpoint';

/** Pseudostates, without the final state, which UML counts as a state. */
export const isPseudo = (kind: VertexKind | undefined): boolean =>
  kind !== undefined && kind !== 'state' && kind !== 'final' && kind !== 'region';

/** The model of a state machine diagram; the first declaration of an id wins (a second one is L108). */
export function stateModel(diagram: StateDiagram): StateModel {
  const vertices = new Map<string, Vertex>();
  for (const v of diagram.vertices) if (!vertices.has(v.id)) vertices.set(v.id, v);
  const composites = new Set(
    diagram.vertices.flatMap((v) => {
      const p = v.parent === undefined ? undefined : vertices.get(v.parent);
      return p && p.kind !== 'region' && !isBorderPoint(v.kind) ? [p.id] : [];
    }),
  );
  return {
    diagram,
    vertices,
    composites,
    out: (id) => diagram.transitions.filter((t) => t.from === id),
    into: (id) => diagram.transitions.filter((t) => t.to === id),
    kind: (id) => vertices.get(id)?.kind,
  };
}

/** States and regions around a vertex, innermost first, without the vertex; unknown parents and cycles end it. */
export function ancestors(m: StateModel, id: string): string[] {
  const out: string[] = [];
  let p = m.vertices.get(id)?.parent;
  while (p !== undefined && m.vertices.has(p) && !out.includes(p) && p !== id) {
    out.push(p);
    p = m.vertices.get(p)?.parent;
  }
  return out;
}

/** Does `id` lie in `owner`, also deeper down? */
export const isInside = (m: StateModel, id: string, owner: string): boolean => ancestors(m, id).includes(owner);

/** The region of `owner` that `id` lies in; undefined when it does not lie in one. */
export function regionUnder(m: StateModel, id: string, owner: string): string | undefined {
  const chain = [id, ...ancestors(m, id)];
  const at = chain.indexOf(owner);
  const region = at > 0 ? chain[at - 1] : undefined;
  return region !== undefined && m.kind(region) === 'region' ? region : undefined;
}

/** Regions of a state in source order. */
export const regionsOf = (m: StateModel, owner: string): string[] =>
  m.diagram.vertices.filter((v) => v.kind === 'region' && v.parent === owner).map((v) => v.id);

/** The frame a vertex is drawn in: its parent state, or for a parent region that region's state. */
export function frameOf(m: StateModel, parent: string | undefined): string | undefined {
  const p = parent === undefined ? undefined : m.vertices.get(parent);
  return p?.kind === 'region' ? p.parent : parent;
}

/**
 * A machine drawn with its own entry and exit points: exactly one state at the top level holds everything else and
 * carries points. It stands for the frame of the machine; the outside of its points lies with the caller.
 */
export function machineFrame(m: StateModel): string | undefined {
  const top = m.diagram.vertices.filter((v) => v.parent === undefined);
  const only = top.length === 1 ? top[0] : undefined;
  if (only?.kind !== 'state') return undefined;
  return m.diagram.vertices.some((v) => isBorderPoint(v.kind) && v.parent === only.id) ? only.id : undefined;
}
