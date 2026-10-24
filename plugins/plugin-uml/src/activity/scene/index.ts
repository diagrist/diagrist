import { type Anchors, domId, type Scene, type Shape } from '@diagrist/core';
import { headerShapes, markShapes, stripShapes, type Words } from '@diagrist/parts';
import { isHandlerFlow } from '../layout/graph.js';
import type { ActivityLayout, PictureTexts } from '../layout/index.js';
import type { LaneArt } from '../layout/lanes.js';
import type { ActivityModel } from '../model/index.js';
import { edgePath, headPath } from './edges.js';
import { nodeShapes } from './nodes.js';

/** Inset of a lane head card and its corner radius in the card look. */
const HEAD = { inset: 2, radius: 8 } as const;

/** Lanes: a frame per lane and a head with its name; in the card look a light frame and a toned head. */
function laneShapes(lanes: readonly LaneArt[], m: ActivityModel): Shape[] {
  const cards = m.diagram.look === 'cards';
  return lanes.flatMap((l): Shape[] => {
    const name = { kind: 'text' as const, ...l.text, text: l.label, font: 'name', anchor: 'middle' as const };
    const tone = m.diagram.partitions.find((p) => p.id === l.id)?.tone ?? 'slate';
    const head = { ...l.head, x: l.head.x + HEAD.inset, w: l.head.w - 2 * HEAD.inset };
    const children: Shape[] = cards
      ? [
          { kind: 'rect', ...l.rect, role: 'cardLane' },
          { kind: 'path', d: headPath(head, HEAD.radius), role: `tone-${tone}` },
          { ...name, role: 'cardHead' },
        ]
      : [
          { kind: 'rect', ...l.rect, role: 'lane' },
          { kind: 'rect', ...l.head, role: 'laneHead' },
          { ...name, role: 'laneName' },
        ];
    return [{ kind: 'group', id: domId.group(l.id), children }];
  });
}

/**
 * The scene of an activity diagram in drawing order: title, lanes, regions with their names, nodes, edges, guards,
 * marks and the decision bar.
 */
export function activityScene(l: ActivityLayout, m: ActivityModel, words: Words & PictureTexts): Scene {
  const cards = m.diagram.look === 'cards';
  const regions = l.regions.map(
    (r): Shape => ({
      kind: 'group',
      id: domId.group(r.id),
      children: [
        { kind: 'rect', ...r.rect, rx: r.rx, role: 'region' },
        ...[...(r.name ? [r.name] : []), ...(r.more ?? [])].map(
          (t): Shape => ({ kind: 'text', x: t.x, y: t.y, text: t.text, role: 'label', font: 'label', anchor: 'start' }),
        ),
      ],
    }),
  );
  const children: Shape[] = [
    ...headerShapes(l.header, words.title, m.diagram.subtitle),
    ...laneShapes(l.lanes, m),
    ...regions,
    ...l.nodes.map((p): Shape => ({ kind: 'group', id: domId.node(p.id), children: nodeShapes(p, cards) })),
    ...l.routes.map(
      (r, k): Shape => ({
        kind: 'group',
        id: domId.edge(k),
        children: [{ kind: 'path', d: edgePath(r.points, r.flow.interrupt, isHandlerFlow(r.flow)), role: 'flow' }],
      }),
    ),
    ...l.guards.map(
      (g): Shape => ({
        kind: 'group',
        id: domId.label(g.route),
        children: [{ kind: 'text', x: g.x, y: g.y, text: g.text, role: 'guard', font: 'label', anchor: g.anchor }],
      }),
    ),
    ...l.marks.map((x): Shape => ({ kind: 'group', children: markShapes(x.id, x.x, x.y) })),
    ...stripShapes(l.strip, words),
  ];
  return { width: l.width, height: l.height, title: m.diagram.title, children };
}

/** Nodes, regions as groups, and edges in drawing order; a guard is the label of its edge. */
export function activityAnchors(l: ActivityLayout): Anchors {
  const guarded = new Set(l.guards.map((g) => g.route));
  return {
    width: l.width,
    height: l.height,
    nodes: l.nodes.map((n) => ({ id: n.id, domId: domId.node(n.id), rect: n.rect })),
    groups: [
      ...l.lanes.map((g) => ({ id: g.id, domId: domId.group(g.id), rect: g.rect })),
      ...l.regions.map((g) => ({ id: g.id, domId: domId.group(g.id), rect: g.rect })),
    ],
    edges: l.routes.map((r, k) => ({
      index: k,
      from: r.flow.from,
      to: r.flow.to,
      domId: domId.edge(k),
      ...(guarded.has(k) ? { labelId: domId.label(k) } : {}),
      points: r.points,
    })),
  };
}
