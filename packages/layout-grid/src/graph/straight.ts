import type { Placed, Point, Rect } from '@diagrist/core';
import { type AlongTexts, textsAlong } from '../label/along.js';
import { occupancy } from '../label/occupancy.js';
import type { LayeredLayout } from '../layered/output.js';
import type { PlacedGroup, Route } from '../layout.js';
import type { GraphEdge, GraphLabel, LayoutGraph } from './spec.js';
import { clearStraight } from './straight-clear.js';
import { tightFrames } from './straight-frames.js';
import { straightRoute } from './straight-route.js';

/** Room around the picture a text along a straight line may take, besides the boxes and frames. */
const AIR = 16;

const isStraight = (e: GraphEdge) => e.profile === 'straight';

/**
 * The graph the layered stages lay out for one with `straight` edges: each such edge hidden, so it orders and places
 * its ends as any edge does but takes no port, track or route. A graph without them is handed back as it is.
 */
export function hideStraight(graph: LayoutGraph): LayoutGraph {
  if (!graph.edges.some(isStraight)) return graph;
  return {
    ...graph,
    edges: graph.edges.map((e): GraphEdge => {
      if (!isStraight(e)) return e;
      const { profile: _, label: __, ends: ___, ...rest } = e;
      return { ...rest, hidden: true };
    }),
  };
}

/** Of the frames holding `end`, the innermost that does not hold `other`: the frame the line leaves near `end`. */
function leftFrame(graph: LayoutGraph, frames: readonly PlacedGroup[], end: string, other: string): Rect | undefined {
  const containers = graph.containers ?? [];
  const holds = (id: string, n: string): boolean => {
    const c = containers.find((k) => k.id === id);
    return c !== undefined && (c.members.includes(n) || containers.some((k) => k.parent === id && holds(k.id, n)));
  };
  const own = containers.filter((c) => holds(c.id, end) && !holds(c.id, other));
  const inner = own.find((c) => !own.some((k) => k.parent === c.id));
  return inner && frames.find((f) => f.id === inner.id)?.rect;
}

const text = (l: GraphLabel | undefined) => (l === undefined ? undefined : { text: l.text, width: l.width });

/**
 * A laid out picture with its `straight` edges drawn: frames of turned layers back at their pad (`tightFrames`), boxes
 * the lines would run through moved (`clearStraight`), then one piece each from outline to outline (`straightRoute`), after
 * the routes of the others, and their texts along them by the spot search for straight lines (`textsAlong`), clear of
 * boxes, lines, frame lines and heads and of the texts set before. A graph without such edges keeps its picture.
 */
export function drawStraight(graph: LayoutGraph, laid: LayeredLayout): LayeredLayout {
  const straight = graph.edges.filter((e) => isStraight(e) && e.from !== e.to);
  if (straight.length === 0) return laid;
  const boxes = new Map(laid.nodes.map((n) => [n.id, n.rect]));
  const tight = tightFrames(graph, laid.frames ?? [], boxes);
  const rects = clearStraight(graph, straight, boxes, tight);
  const moved = new Map([...rects, ...tight.map((f) => [f.id, f.rect] as const)]);
  const layout: LayeredLayout = {
    ...laid,
    nodes: laid.nodes.map((n) => ({ ...n, rect: rects.get(n.id) ?? n.rect })),
    placed: laid.placed.map((p) => (p.kind === 'text' ? p : { ...p, rect: moved.get(p.key) ?? p.rect })),
    ...(laid.frames ? { frames: tight } : {}),
  };
  const before = extentOf([...boxes.values(), ...(laid.frames ?? []).map((f) => f.rect)]);
  const after = extentOf([...rects.values(), ...tight.map((f) => f.rect)]);
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
  const drawn = straight.flatMap((e) => {
    const a = rects.get(e.from);
    const b = rects.get(e.to);
    if (a === undefined || b === undefined) return [];
    return [
      { e, route: straightRoute(e.id, { rect: a, node: nodes.get(e.from) }, { rect: b, node: nodes.get(e.to) }) },
    ];
  });
  const lines: Route[] = drawn.map((d) => d.route);
  const frames = layout.frames ?? [];
  const room = occupancy(
    {
      nodes: graph.nodes.map((n) => ({
        id: n.id,
        col: '',
        row: '',
        ...(n.shape === 'ellipse' ? { shape: 'ellipse' as const } : {}),
        ...(n.body ? { caption: { w: n.width, below: n.height - n.body.height } } : {}),
      })),
    },
    { nodes: layout.nodes, groups: frames },
    [...layout.routes, ...lines],
    { area: areaOf(layout) },
  );
  for (const f of frames) {
    const head = graph.containers?.find((c) => c.id === f.id)?.head;
    if (head) room.take({ x: f.rect.x, y: f.rect.y, w: head.width, h: head.height });
  }
  for (const l of layout.labels) room.take(l.box);
  const offset = layout.routes.length;
  const size = Math.max(
    0,
    ...straight.flatMap((e) => [e.label?.size ?? 0, e.ends?.from?.size ?? 0, e.ends?.to?.size ?? 0]),
  );
  const wanted = drawn.map(({ e }, i): AlongTexts => {
    const [middle, from, to] = [text(e.label), text(e.ends?.from), text(e.ends?.to)];
    const inside = { from: leftFrame(graph, frames, e.from, e.to), to: leftFrame(graph, frames, e.to, e.from) };
    return {
      route: i,
      ...(middle ? { middle } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      inside: { ...(inside.from ? { from: inside.from } : {}), ...(inside.to ? { to: inside.to } : {}) },
    };
  });
  const gap = graph.metrics.labelGap;
  const same = (p: Point, q: Point) => p[0] === q[0] && p[1] === q[1];
  const tips = lines.map((r) => [r.points[0] ?? [0, 0], r.points.at(-1) ?? [0, 0]] as const);
  const apart = (a: number, b: number) => !tips[a]?.some((p) => tips[b]?.some((q) => same(p, q)));
  const labels = textsAlong(lines, wanted, room, { size, gap }, apart).map((l) => ({ ...l, route: l.route + offset }));
  const routes = [...layout.routes, ...lines];
  const placed: Placed[] = labels.map((l, i) => {
    const n = labels.slice(0, i).filter((k) => k.route === l.route).length + 1;
    return { key: `${routes[l.route]?.edge ?? ''}.label.${n}`, kind: 'text', rect: l.box };
  });
  return {
    ...layout,
    routes,
    labels: [...layout.labels, ...labels],
    placed: [...layout.placed, ...placed],
    width: Math.max(laid.width + after.right - before.right, ...labels.map((l) => l.box.x + l.box.w)),
    bottom: Math.max(laid.bottom + after.bottom - before.bottom, ...labels.map((l) => l.box.y + l.box.h)),
  };
}

/** The right and bottom edge of what `rects` cover. */
const extentOf = (rects: readonly Rect[]) => ({
  right: Math.max(0, ...rects.map((r) => r.x + r.w)),
  bottom: Math.max(0, ...rects.map((r) => r.y + r.h)),
});

/** The room texts may take: around every box and frame, `AIR` more at the sides and below, none above. */
function areaOf(layout: LayeredLayout): Rect {
  const rects = [...layout.nodes.map((n) => n.rect), ...(layout.frames ?? []).map((f) => f.rect)];
  const x = Math.min(...rects.map((r) => r.x)) - AIR;
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.w)) + AIR;
  const bottom = Math.max(...rects.map((r) => r.y + r.h)) + AIR;
  return { x, y, w: right - x, h: bottom - y };
}
