import { type Anchors, domId, type Scene, type Shape } from '@diagrist/core';
import { headerShapes, markShapes, stripShapes, type Words } from '@diagrist/parts';
import { noteShapes } from '../../shared/note-shapes.js';
import type { ClassLayout, PictureTexts } from '../layout/index.js';
import type { ClassModel } from '../model.js';
import { edgeShape, labelShape } from './edges.js';
import { classShape, diamondShape, packageShape } from './nodes.js';

/** Routes with a relation, in drawing order: the index `k` of `edge-<k>` and `label-<k>`. */
const drawn = (l: ClassLayout) =>
  l.routes.flatMap((route, i) => {
    const relation = l.relations[i];
    return relation ? [{ route, relation, i }] : [];
  });

function nodeShapes(l: ClassLayout, m: ClassModel, cards: boolean): Shape[] {
  return l.grid.nodes.flatMap((p): Shape[] => {
    const c = m.classifiers.get(p.id);
    if (c) return [classShape(c, p.rect, cards)];
    const a = m.associations.get(p.id);
    return a ? [diamondShape(a, p.rect, cards)] : [];
  });
}

/**
 * The scene of a class diagram in drawing order: title, packages, classifiers and diamonds, notes, relations with
 * their halos, the lines of association classes, labels, marks and the decision bar.
 */
export function classScene(l: ClassLayout, m: ClassModel, words: Words & PictureTexts): Scene {
  const cards = m.diagram.look === 'cards';
  const edges = drawn(l);
  const bundled = new Set(edges.filter((e) => l.bundles.has(e.route.edge)).map((e) => e.route.edge));
  const children: Shape[] = [
    ...headerShapes(l.header, words.title, m.diagram.subtitle),
    ...l.grid.groups.map((g) => {
      const p = m.packages.get(g.id);
      return packageShape(g.id, p?.label ?? g.id, p?.tone, g.rect, cards);
    }),
    ...nodeShapes(l, m, cards),
    ...noteShapes(l.notes, cards),
    ...edges.map((e, k) => edgeShape(e.relation, e.route, bundled.has(e.route.edge), domId.edge(k))),
    ...l.tethers.map((t): Shape => ({ kind: 'line', x1: t.a[0], y1: t.a[1], x2: t.b[0], y2: t.b[1], role: 'tether' })),
    ...edges.flatMap((e, k) => {
      const own = l.labels.filter((x) => x.route === e.i);
      return own.length ? [labelShape(own, e.relation.emph === true, domId.label(k))] : [];
    }),
    ...l.marks.map((x): Shape => ({ kind: 'group', children: markShapes(x.id, x.x, x.y) })),
    ...stripShapes(l.strip, words),
  ];
  return { width: l.width, height: l.height, title: m.diagram.title, children };
}

/** Classifiers and diamonds as nodes, packages as groups, relations as edges in drawing order. */
export function classAnchors(l: ClassLayout): Anchors {
  return {
    width: l.width,
    height: l.height,
    nodes: l.grid.nodes.map((n) => ({ id: n.id, domId: domId.node(n.id), rect: n.rect })),
    groups: l.grid.groups.map((g) => ({ id: g.id, domId: domId.group(g.id), rect: g.rect })),
    edges: drawn(l).map((e, k) => ({
      index: k,
      from: e.relation.from,
      to: e.relation.to,
      domId: domId.edge(k),
      ...(l.labels.some((x) => x.route === e.i) ? { labelId: domId.label(k) } : {}),
      points: e.route.points,
    })),
  };
}
