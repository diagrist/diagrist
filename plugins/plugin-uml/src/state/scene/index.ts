import { type Anchors, domId, type Point, type Scene, type Shape } from '@diagrist/core';
import { headerShapes, markShapes, stripShapes, type Words } from '@diagrist/parts';
import { noteShapes } from '../../class/scene/notes.js';
import type { PictureTexts, StateLayout } from '../layout/index.js';
import { borderOf, hostOf } from '../layout/points/geometry.js';
import type { StateModel } from '../model.js';
import { frameShape } from './frames.js';
import { vertexShape } from './nodes.js';

const pathOf = (points: readonly Point[]): string =>
  points.map(([x, y], k) => `${k === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');

/** Routes with their transition, in drawing order: the index `k` of `edge-<k>` and `label-<k>`. */
const drawn = (l: StateLayout) => l.routes.map((route, i) => ({ route, i, emph: l.ends[i]?.emph === true }));

/**
 * The scene of a state machine in drawing order: title, composite states, vertices, notes, transitions with their
 * halos and open heads, labels, marks and the decision bar.
 */
export function stateScene(l: StateLayout, m: StateModel, words: Words & PictureTexts): Scene {
  const cards = m.diagram.look === 'cards';
  const points = l.grid.nodes.filter((n) => borderOf(m, n.id) || hostOf(m, n.id)).map((n) => n.rect);
  const edges = drawn(l);
  const children: Shape[] = [
    ...headerShapes(l.header, words.title, m.diagram.subtitle),
    ...l.grid.groups.map((g) => frameShape(g, m, l)),
    ...l.grid.nodes.flatMap((p): Shape[] => {
      const v = m.vertices.get(p.id);
      return v ? [vertexShape(m, v, p.rect, cards, points, l.names.get(p.id))] : [];
    }),
    ...noteShapes(l.notes, cards),
    ...edges.map(
      (e, k): Shape => ({
        kind: 'group',
        id: domId.edge(k),
        children: [
          { kind: 'path', d: pathOf(e.route.points), role: 'halo' },
          { kind: 'path', d: pathOf(e.route.points), role: e.emph ? 'transitionEmph' : 'transition' },
        ],
      }),
    ),
    ...edges.flatMap((e, k): Shape[] => {
      const own = l.labels.filter((x) => x.route === e.i);
      return own.length
        ? [
            {
              kind: 'group',
              id: domId.label(k),
              children: own.map((x) => ({
                kind: 'text',
                x: x.x,
                y: x.y,
                text: x.text,
                role: e.emph ? 'labelEmph' : 'label',
                font: 'label',
                anchor: x.anchor,
              })),
            },
          ]
        : [];
    }),
    ...l.marks.map((x): Shape => ({ kind: 'group', children: markShapes(x.id, x.x, x.y) })),
    ...stripShapes(l.strip, words),
  ];
  return { width: l.width, height: l.height, title: m.diagram.title, children };
}

/** Vertices as nodes, composite states as groups, transitions as edges in drawing order. */
export function stateAnchors(l: StateLayout): Anchors {
  return {
    width: l.width,
    height: l.height,
    nodes: l.grid.nodes.map((n) => ({ id: n.id, domId: domId.node(n.id), rect: n.rect })),
    groups: l.grid.groups.map((g) => ({ id: g.id, domId: domId.group(g.id), rect: g.rect })),
    edges: l.routes.map((r, k) => ({
      index: k,
      from: l.ends[k]?.from ?? '',
      to: l.ends[k]?.to ?? '',
      domId: domId.edge(k),
      ...(l.labels.some((x) => x.route === k) ? { labelId: domId.label(k) } : {}),
      points: r.points,
    })),
  };
}
