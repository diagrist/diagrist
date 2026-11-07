import type { Placed, Point, Rect } from '@diagrist/core';
import type { Side } from '../geometry.js';
import type { EdgeLabel } from '../label/types.js';
import type { LayeredLayout } from '../layered/output.js';
import type { LayeredSpec } from '../layered/spec.js';
import { respotTexts } from './dock-texts.js';
import type { GraphEdge, GraphLabel, LayoutGraph } from './spec.js';

/**
 * The side a side becomes when the picture turns a quarter to the left: the layers' top to the left, the right of a
 * layer, where the stages seat texts beside a line, to the top, so they stand above the lines they belong to.
 */
const TURNED: Readonly<Record<Side, Side>> = { top: 'left', right: 'top', bottom: 'right', left: 'bottom' };

/** The turn of points and rectangles, `k` the height the right edge of the laid out picture comes to. */
const turner = (k: number) => ({
  point: ([x, y]: Point): Point => [y, k - x],
  rect: (r: Rect): Rect => ({ x: r.y, y: k - r.x - r.w, w: r.h, h: r.w }),
});

/** The lines of a label, each with its width. */
const linesOf = (l: GraphLabel) => l.lines ?? [{ text: l.text, width: l.width }];

/**
 * A label as the stages lay it out before the turn: as wide as the label is high and as high as it is wide, in empty
 * lines of its font, so the room they keep beside a line is the room the text needs along it once turned.
 */
function turnedLabel(l: GraphLabel): GraphLabel {
  const line = l.size + 2;
  const high = linesOf(l).length * line;
  const count = Math.max(1, Math.ceil(l.width / line));
  return {
    text: '',
    width: high,
    size: l.size,
    lines: Array.from({ length: count }, () => ({ text: '', width: high })),
    ...(l.at === undefined ? {} : { at: l.at }),
  };
}

/**
 * A graph whose layers run left to right (`given.direction` `right`) as the stages lay it out, down: every box with
 * its sides swapped, every label turned (`turnedLabel`), the end that stands first the other one, since the start of
 * a layer comes to its bottom, the left margin at the top as well, and frames padded by their head on
 * every side, since the stages keep a head's room only at the top. Any other graph is handed back as it is.
 */
export function turnGraph(graph: LayoutGraph): LayoutGraph {
  if (graph.given?.direction !== 'right') return graph;
  const m = graph.metrics;
  return {
    ...graph,
    nodes: graph.nodes.map((n) => ({ ...n, width: n.height, height: n.width })),
    edges: graph.edges.map(
      (e): GraphEdge => ({
        ...e,
        ...(e.label ? { label: turnedLabel(e.label) } : {}),
        ...(e.first === undefined ? {} : { first: e.first === 'to' ? 'from' : 'to' }),
      }),
    ),
    ...(graph.containers
      ? {
          containers: graph.containers.map((c) => ({
            ...c,
            pad: Math.max(c.pad, c.top),
            top: c.pad,
            head: { width: 0, height: 0 },
          })),
        }
      : {}),
    metrics: { ...m, left: m.left, top: m.left },
  };
}

/**
 * The middle of the lines of a text set in `room`: the middle of the room, or, where an upright piece of its own line
 * runs beside the room no further than `gap`, as near that piece as the widest line lets, as the room was set
 * against it before the turn.
 */
function middleIn(room: Rect, widest: number, route: readonly Point[], gap: number): number {
  const mid = room.x + room.w / 2;
  const beside = route.slice(1).flatMap((p, i) => {
    const q = route[i] as Point;
    const meets = p[0] === q[0] && Math.min(p[1], q[1]) < room.y + room.h && Math.max(p[1], q[1]) > room.y;
    return meets ? [p[0]] : [];
  });
  const slack = (room.w - widest) / 2;
  if (beside.some((x) => x >= room.x + room.w && x <= room.x + room.w + gap)) return mid + slack;
  if (beside.some((x) => x <= room.x && x >= room.x - gap)) return mid - slack;
  return mid;
}

/**
 * A picture laid out by `turnGraph` turned a quarter to the left, its right edge to the top margin: boxes, frames,
 * lines and their sides, size; each
 * label's text set in the room its turned label took, its lines centred there or against an upright piece of its line
 * beside the room (`middleIn`), and moved by the one spot search
 * where that room is not clear of what turned around it (`respotTexts`).
 */
export function turnBack(
  graph: LayoutGraph,
  layout: LayeredLayout,
  specOf: (graph: LayoutGraph) => LayeredSpec,
): LayeredLayout {
  if (graph.given?.direction !== 'right') return layout;
  const turn = turner(graph.metrics.top + layout.width);
  const flipRect = turn.rect;
  const nodes = layout.nodes.map((n) => ({ ...n, rect: flipRect(n.rect) }));
  const frames = layout.frames?.map((f) => ({ ...f, rect: flipRect(f.rect) }));
  const routes = layout.routes.map((r) => ({
    ...r,
    points: r.points.map(turn.point),
    fromSide: TURNED[r.fromSide],
    toSide: TURNED[r.toSide],
  }));
  const byEdge = new Map(graph.edges.map((e) => [e.id, e]));
  const set = [...new Set(layout.labels.map((l) => l.route))].flatMap((route): EdgeLabel[] => {
    const own = layout.labels.filter((l) => l.route === route);
    const label = byEdge.get(layout.routes[route]?.edge ?? '')?.label;
    if (label === undefined || own.length === 0) return [];
    const x0 = Math.min(...own.map((l) => l.box.x));
    const y0 = Math.min(...own.map((l) => l.box.y));
    const room = flipRect({
      x: x0,
      y: y0,
      w: Math.max(...own.map((l) => l.box.x + l.box.w)) - x0,
      h: Math.max(...own.map((l) => l.box.y + l.box.h)) - y0,
    });
    const line = label.size + 2;
    const lines = linesOf(label);
    const top = room.y + (room.h - lines.length * line) / 2;
    const widest = Math.max(...lines.map((l) => l.width));
    const mid = middleIn(room, widest, routes[route]?.points ?? [], graph.metrics.labelGap + 1);
    return lines.map((l, i) => ({
      text: l.text,
      x: mid,
      y: top + i * line + label.size,
      anchor: 'middle' as const,
      box: { x: mid - l.width / 2, y: top + i * line, w: l.width, h: line },
      route,
      part: 'name' as const,
    }));
  });
  const labels = respotTexts(specOf(graph), { routes, nodes, frames: frames ?? [] }, set, new Map());
  const placed: Placed[] = [
    ...layout.placed.filter((p) => p.kind !== 'text').map((p) => ({ ...p, rect: flipRect(p.rect) })),
    ...labels.map((l, i): Placed => {
      const n = labels.slice(0, i).filter((k) => k.route === l.route).length + 1;
      return { key: `${layout.routes[l.route]?.edge ?? ''}.label.${n}`, kind: 'text', rect: l.box };
    }),
  ];
  return {
    ...layout,
    nodes,
    routes,
    labels,
    placed,
    width: layout.bottom,
    bottom: Math.max(
      ...nodes.map((n) => n.rect.y + n.rect.h),
      ...routes.flatMap((r) => r.points.map((p) => p[1])),
      ...labels.map((l) => l.box.y + l.box.h),
      ...(frames ?? []).map((f) => f.rect.y + f.rect.h),
    ),
    ...(frames ? { frames } : {}),
  };
}
