import { domId, type Point, type Shape } from '@diagrist/core';
import type { EdgeLabel } from '@diagrist/layout-grid';
import { markShapes } from '@diagrist/parts';
import type { ArchitectureLayout } from '../../layout/index.js';
import type { ArchitectureModel } from '../../model/types.js';
import { edgeShapes } from '../../scene/edges.js';
import { labelledRoutes } from '../../scene/labels.js';
import type { Surface } from '../../scene/surfaces.js';
import { PILL } from './seat.js';

const CORNER = 8;
const BADGE = { r: 8, dy: 3.5 } as const;
const PILL_RX = 10;

const round = (n: number): number => Math.round(n * 10) / 10;

/** The points of a path written as `M x y L x y ...`, as the edges of C4 are. */
const pointsOf = (d: string): Point[] =>
  [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m): Point => [Number(m[1]), Number(m[2])]);

/** A polyline with each corner rounded by up to `CORNER`, never more than half of the shorter leg. */
export function roundedPath(points: readonly Point[]): string {
  const [first] = points;
  if (!first) return '';
  const parts = [`M${first[0]} ${first[1]}`];
  for (let i = 1; i < points.length - 1; i++) {
    const [a, b, c] = [points[i - 1] as Point, points[i] as Point, points[i + 1] as Point];
    const lin = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const lout = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const r = Math.min(CORNER, lin / 2, lout / 2);
    if (r === 0) continue;
    const p = [b[0] - ((b[0] - a[0]) / lin) * r, b[1] - ((b[1] - a[1]) / lin) * r].map(round);
    const q = [b[0] + ((c[0] - b[0]) / lout) * r, b[1] + ((c[1] - b[1]) / lout) * r].map(round);
    parts.push(`L${p[0]} ${p[1]} Q${b[0]} ${b[1]} ${q[0]} ${q[1]}`);
  }
  const last = points.at(-1) as Point;
  if (points.length > 1) parts.push(`L${last[0]} ${last[1]}`);
  return parts.join(' ');
}

/** Lines and their halos with rounded corners; filled heads of toned edges keep their outline. */
const rounded = (shape: Shape): Shape => {
  if (shape.kind === 'group') return { ...shape, children: shape.children.map(rounded) };
  if (shape.kind !== 'path' || shape.d.endsWith('Z')) return shape;
  return { ...shape, d: roundedPath(pointsOf(shape.d)) };
};

/** Every edge as the standard scene draws it, with its corners rounded. */
export const panelEdgeShapes = (
  model: ArchitectureModel,
  layout: ArchitectureLayout,
  under: readonly Surface[],
): Shape[] => edgeShapes(model, layout.routes, under, layout.sizing.m.markerSize).map(rounded);

/** Name and detail of one route in a white pill on its line; texts at an end of the edge stand bare. */
function pillShapes(labels: readonly EdgeLabel[], accent: boolean): Shape[] {
  const inside = labels.filter((l) => l.part === 'name' || l.part === 'detail');
  const text = (l: EdgeLabel, role: string): Shape => ({
    kind: 'text',
    x: l.x,
    y: l.y,
    text: l.text,
    role,
    font: 'label',
    anchor: l.anchor,
  });
  const bare = labels.filter((l) => !inside.includes(l)).map((l) => text(l, 'pillText'));
  if (inside.length === 0) return bare;
  const x = Math.min(...inside.map((l) => l.box.x)) - PILL.x;
  const y = Math.min(...inside.map((l) => l.box.y)) - PILL.y;
  const w = Math.max(...inside.map((l) => l.box.x + l.box.w)) + PILL.x - x;
  const h = Math.max(...inside.map((l) => l.box.y + l.box.h)) + PILL.y - y;
  const name = accent ? 'pillTextAccent' : 'pillText';
  return [
    { kind: 'rect', x, y, w, h, rx: Math.min(PILL_RX, h / 2), role: 'pill' },
    ...inside.map((l) => text(l, l.part === 'detail' ? 'pillDetail' : name)),
    ...bare,
  ];
}

/** A flow number in a small circle: filled in the focus colour on a focus flow, white on the others. */
export const panelBadge = (n: number, x: number, y: number, accent: boolean): Shape[] => [
  { kind: 'circle', cx: x, cy: y, r: BADGE.r, role: accent ? 'badgeAccent' : 'badge' },
  {
    kind: 'text',
    x,
    y: y + BADGE.dy,
    text: String(n),
    role: accent ? 'badgeTextAccent' : 'badgeText',
    font: 'badge',
    anchor: 'middle',
  },
];

/** Per labelled route a group `label-<i>` with its pill, flow number and marks; then the marks at nodes. */
export function panelLabelShapes(model: ArchitectureModel, layout: ArchitectureLayout): Shape[] {
  const accent = (i: number) => model.edges[Number(layout.routes[i]?.edge)]?.step?.accent === true;
  const groups = labelledRoutes(layout).map(
    (i): Shape => ({
      kind: 'group',
      id: domId.label(i),
      children: [
        ...pillShapes(
          layout.labels.filter((l) => l.route === i),
          accent(i),
        ),
        ...layout.badges.filter((b) => b.route === i).flatMap((b) => panelBadge(b.n, b.x, b.y, b.accent)),
        ...layout.marks.filter((m) => m.route === i).flatMap((m) => markShapes(m.id, m.x, m.y)),
      ],
    }),
  );
  return [...groups, ...layout.marks.filter((m) => m.route === undefined).flatMap((m) => markShapes(m.id, m.x, m.y))];
}
