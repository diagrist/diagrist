import { type Anchors, domId } from '@diagrist/core';
import type { Route } from '@diagrist/layout-grid';
import type { Drawn } from './drawn.js';
import type { Laid } from './laid.js';

/** Actors and use cases as nodes, subjects as groups, relations as edges in drawing order. */
export function anchorsOf(
  l: Pick<Laid, 'layout' | 'labels'> & { readonly routes: readonly Route[] },
  drawn: readonly Drawn[],
  size: { readonly width: number; readonly height: number },
): Anchors {
  return {
    width: size.width,
    height: size.height,
    nodes: l.layout.nodes.map((n) => ({ id: n.id, domId: domId.node(n.id), rect: n.rect })),
    groups: l.layout.groups.map((g) => ({ id: g.id, domId: domId.group(g.id), rect: g.rect })),
    edges: drawn.map((d, k) => ({
      index: k,
      from: d.relation.from,
      to: d.relation.to,
      domId: domId.edge(k),
      ...(l.labels.some((x) => x.route === d.route) ? { labelId: domId.label(k) } : {}),
      points: l.routes[d.route]?.points ?? [],
      span: d.relation.span,
    })),
  };
}
