import { type Anchors, domId, markAreas, type Scene, type Shape } from '@diagrist/core';
import { headerShapes, markShapes, stripShapes, type Words, withAreaLegend } from '@diagrist/parts';
import { noteShapes } from '../../shared/note-shapes.js';
import { haloOf } from '../../shared/trunk-halos.js';
import type { Tether } from '../layout/extras.js';
import type { ClassLayout, PictureTexts } from '../layout/index.js';
import type { ClassModel } from '../model.js';
import { classAreaMarks, usedAreas } from './areas.js';
import { edgeShape, labelShape } from './edges.js';
import { classShape, diamondShape, packageShape } from './nodes.js';

/** The dashed line of an association class: one line where it runs straight, else a path. */
function tetherShape(t: Tether): Shape {
  const [a, b] = t.points;
  if (t.points.length === 2 && a && b) return { kind: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1], role: 'tether' };
  return { kind: 'path', d: `M${t.points.map((p) => p.join(' ')).join(' L')}`, role: 'tether' };
}

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
  const paths = edges.map((e) => e.route.points);
  const bundled = new Set(edges.filter((e) => l.bundles.has(e.route.edge)).map((e) => e.route.edge));
  const children: Shape[] = [
    ...headerShapes(l.header, words.title, m.diagram.subtitle),
    ...l.grid.groups.map((g) => {
      const p = m.packages.get(g.id);
      return packageShape(g.id, p?.label ?? g.id, p?.tone, g.rect, cards);
    }),
    ...nodeShapes(l, m, cards),
    ...noteShapes(l.notes, cards),
    ...edges.map((e, k) => edgeShape(e.relation, e.route, bundled.has(e.route.edge), domId.edge(k), haloOf(paths, k))),
    ...l.tethers.map(tetherShape),
    ...edges.flatMap((e, k) => {
      const own = l.labels.filter((x) => x.route === e.i);
      return own.length ? [labelShape(own, e.relation.emph === true, domId.label(k))] : [];
    }),
    ...l.marks.map((x): Shape => ({ kind: 'group', children: markShapes(x.id, x.x, x.y) })),
    ...stripShapes(l.strip, words),
  ];
  const marks = classAreaMarks(
    m,
    edges.map((e) => e.relation),
  );
  const scene: Scene = {
    width: l.width,
    height: l.height,
    title: m.diagram.title,
    areas: m.diagram.areas.paint,
    children: markAreas(children, marks),
  };
  return withAreaLegend(scene, m.diagram.areas, usedAreas(m), cards ? 'cardBox' : 'box');
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
      span: e.relation.span,
    })),
  };
}
