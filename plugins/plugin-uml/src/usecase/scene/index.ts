import { type Anchors, domId, markAreas, type Scene, type Shape } from '@diagrist/core';
import { headerShapes, markShapes, stripShapes, type Words, withAreaLegend } from '@diagrist/parts';
import { actorArt } from '../layout/actor.js';
import { useCaseArt } from '../layout/ellipse.js';
import type { PictureTexts, UseCaseLayout } from '../layout/index.js';
import { SUBJECT_TITLE } from '../layout/spec.js';
import type { UseCaseModel } from '../model.js';
import { markExtendNote, useCaseAreaMarks, usedAreas } from './areas.js';
import { commentShape, edgeShape, labelShape } from './edges.js';
import { actorShapes, useCaseShapes } from './nodes.js';

/** Subjects: a rectangle with the name at the top left, in the card look a toned, rounded area. */
function subjectShapes(l: UseCaseLayout, m: UseCaseModel): Shape[] {
  const cards = m.diagram.look === 'cards';
  return l.grid.groups.map((g) => {
    const s = m.subjects.get(g.id);
    const rect: Shape = cards
      ? { kind: 'rect', ...g.rect, rx: 12, role: `tint-${s?.tone ?? 'slate'}` }
      : { kind: 'rect', ...g.rect, role: 'subject' };
    const x = g.rect.x + SUBJECT_TITLE.x;
    const y = g.rect.y + SUBJECT_TITLE.y;
    const title: Shape = { kind: 'text', x, y, text: s?.label ?? '', role: 'subjectName', font: 'name' };
    return { kind: 'group', id: domId.group(g.id), children: [rect, title] };
  });
}

function nodeShapes(l: UseCaseLayout, m: UseCaseModel): Shape[] {
  const cards = m.diagram.look === 'cards';
  return l.grid.nodes.flatMap((p): Shape[] => {
    const a = m.actors.get(p.id);
    const u = m.cases.get(p.id);
    const children = a
      ? actorShapes(actorArt(a, p.rect), { cards, ...(a.tone ? { tone: a.tone } : {}), emph: a.emph === true })
      : u
        ? useCaseShapes(useCaseArt(u, p.rect), { cards, ...(u.tone ? { tone: u.tone } : {}), emph: u.emph === true })
        : [];
    return [{ kind: 'group', id: domId.node(p.id), children }];
  });
}

/**
 * The scene of a use case diagram in drawing order: title, subjects, actors and use cases, lines with their halos,
 * comments, labels, marks and the decision bar.
 */
export function useCaseScene(l: UseCaseLayout, m: UseCaseModel, words: Words & PictureTexts): Scene {
  const cards = m.diagram.look === 'cards';
  const labelled = l.drawn.flatMap((d, k) => {
    const own = l.labels.filter((x) => x.route === d.route);
    return own.length ? [labelShape(own, d.relation.emph === true, domId.label(k))] : [];
  });
  const children: Shape[] = [
    ...headerShapes(l.header, words.title, m.diagram.subtitle),
    ...subjectShapes(l, m),
    ...nodeShapes(l, m),
    ...l.drawn.map((d, k) => edgeShape(d, l.routes[d.route]?.points ?? [], domId.edge(k))),
    ...l.comments.map((c) => markExtendNote(m, l, c.route, commentShape(c, cards))),
    ...labelled,
    ...l.marks.map((x): Shape => ({ kind: 'group', children: markShapes(x.id, x.x, x.y) })),
    ...stripShapes(l.strip, words),
  ];
  const scene: Scene = {
    width: l.width,
    height: l.height,
    title: m.diagram.title,
    areas: m.diagram.areas.paint,
    children: markAreas(children, useCaseAreaMarks(m, l)),
  };
  return withAreaLegend(scene, m.diagram.areas, usedAreas(m), cards ? 'noteCard' : 'outline');
}

/** Actors and use cases as nodes, subjects as groups, relations as edges in drawing order. */
export function useCaseAnchors(l: UseCaseLayout): Anchors {
  return {
    width: l.width,
    height: l.height,
    nodes: l.grid.nodes.map((n) => ({ id: n.id, domId: domId.node(n.id), rect: n.rect })),
    groups: l.grid.groups.map((g) => ({ id: g.id, domId: domId.group(g.id), rect: g.rect })),
    edges: l.drawn.map((d, k) => ({
      index: k,
      from: d.relation.from,
      to: d.relation.to,
      domId: domId.edge(k),
      ...(l.labels.some((x) => x.route === d.route) ? { labelId: domId.label(k) } : {}),
      points: l.routes[d.route]?.points ?? [],
    })),
  };
}
