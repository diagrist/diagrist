import type { Point, Rect } from '@diagrist/core';
import { signEdges } from '../label/signs.js';
import type { EdgeLabel, EdgeText } from '../label/types.js';
import type { GridLayout, PlacedGroup, Route } from '../layout.js';
import type { GridMetrics, GridSpec } from '../spec.js';
import type { LayeredEdge, LayeredSpec } from './spec.js';

/** What the texts of a laid out layered picture keep clear of: its boxes, frames and lines, and its size. */
export interface Drawn {
  readonly routes: readonly Route[];
  readonly rects: ReadonlyMap<string, Rect>;
  readonly frames: readonly PlacedGroup[];
  readonly width: number;
  readonly bottom: number;
}

/** The measures of the spot search for texts of the font size `size`, `labelGap` from their line. */
function metricsOf(size: number, labelGap: number): GridMetrics {
  return {
    grid: 1,
    nodeW: 0,
    nodeH: 0,
    colGap: 0,
    subColGap: 0,
    rowGap: 0,
    marginX: 0,
    firstRowY: 0,
    margin: 0,
    laneGap: 0,
    portSpread: 0,
    loopReach: 0,
    framePad: { top: 0, bottom: 0, x: 0 },
    labelFont: { size },
    labelLineH: size + 2,
    labelGap,
  };
}

/**
 * The lines of the text of `e` above the middle of the longest horizontal piece of its route `r` (index `i`), the
 * last `labelGap` above it, each centred; beside the middle of the longest piece where none is horizontal.
 */
function overMiddle(e: LayeredEdge, r: Route, i: number, labelGap: number): EdgeLabel[] {
  const label = e.label ?? { text: '', width: 0, size: 0 };
  const lines = label.lines ?? [{ text: label.text, width: label.width }];
  const pieces = r.points.slice(1).map((q, k) => [r.points[k] as Point, q] as const);
  const length = ([p, q]: readonly [Point, Point]) => Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]);
  const flat = pieces.filter(([p, q]) => p[1] === q[1]);
  const [p, q] = [...(flat.length > 0 ? flat : pieces)].sort((a, b) => length(b) - length(a))[0] ?? [
    [0, 0],
    [0, 0],
  ];
  const [x, y] = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const line = label.size + 2;
  const top = y - labelGap - lines.length * line;
  return lines.map((l, k) => ({
    text: l.text,
    x,
    y: top + k * line + label.size,
    anchor: 'middle' as const,
    box: { x: x - l.width / 2, y: top + k * line, w: l.width, h: line },
    route: i,
    part: 'name' as const,
  }));
}

const movedRect = (r: Rect, dx: number): Rect => ({ ...r, x: r.x + dx });
const movedText = (l: EdgeLabel, dx: number): EdgeLabel => ({ ...l, x: l.x + dx, box: movedRect(l.box, dx) });

/** A drawn picture moved right by `dx`, so the spot search, which keeps texts right of 0, sees rails left of it. */
const shifted = (d: Drawn, dx: number): Drawn => ({
  ...d,
  routes: d.routes.map((r) => ({ ...r, points: r.points.map(([x, y]) => [x + dx, y] as const) })),
  rects: new Map([...d.rects].map(([n, r]) => [n, movedRect(r, dx)])),
  frames: d.frames.map((f) => ({ ...f, rect: movedRect(f.rect, dx) })),
});

/**
 * The texts of a layered picture placed by the one spot search of the library (`signEdges`), as the channel grid
 * places its own: each stays where the pipeline seated it (`first`) while that spot is clear of boxes, heads,
 * frames that hold neither end of its line, foreign lines and the outlines of frames, which it keeps as far from as
 * from a line, and the texts placed before it, else takes the first
 * clear spot beside or on its line, the longest piece first and nearest its middle, wrapped where that helps. An
 * edge with a text that runs through no gap (`chained` names those that do), such as one drawn beside its layer,
 * starts beside the middle of its longest horizontal piece. `crowded` names the routes whose texts found no clear
 * spot. A picture whose lines come nearer to 0 than its widest text, as rails may before it is moved inside, is
 * searched moved right, so a text may stand left of its line where the picture then grows.
 */
export function spotLabels(
  spec: LayeredSpec,
  drawn: Drawn,
  first: readonly EdgeLabel[],
  chained: ReadonlySet<string>,
): { labels: EdgeLabel[]; crowded: number[] } {
  const widest = Math.max(0, ...spec.edges.map((e) => e.label?.width ?? 0)) + spec.metrics.labelGap;
  const low = Math.min(
    0,
    ...drawn.routes.flatMap((r) => r.points.map((p) => p[0] - widest)),
    ...first.map((l) => l.box.x),
  );
  if (low < 0) {
    const dx = Math.ceil(-low) + spec.metrics.left;
    const found = spotLabels(
      spec,
      shifted(drawn, dx),
      first.map((l) => movedText(l, dx)),
      chained,
    );
    return { ...found, labels: found.labels.map((l) => movedText(l, -dx)) };
  }
  const labelled = spec.edges.filter((e) => e.label !== undefined);
  if (labelled.length === 0) return { labels: [...first], crowded: [] };
  const m = metricsOf(labelled[0]?.label?.size ?? 0, spec.metrics.labelGap);
  const nodes = spec.nodes.filter((n) => drawn.rects.has(n.id));
  const grid: GridSpec = {
    cols: [],
    rows: [],
    nodes: nodes.map((n) => ({ id: n.id, col: '', row: '', width: n.width, height: n.height })),
    groups: (spec.frames ?? []).map((f) => ({
      id: f.id,
      ...(f.parent === undefined ? {} : { parent: f.parent }),
      members: f.members,
      pads: { top: f.top, bottom: f.pad, left: f.pad, right: f.pad },
      head: { x: 0, y: 0, w: f.head.width, h: f.head.height },
    })),
    edges: spec.edges.map((e) => ({ id: e.id, from: e.from, to: e.to })),
    metrics: m,
    adaptive: false,
    channels: true,
  };
  const layout: GridLayout = {
    cols: [],
    rows: [],
    gutters: { cols: [], rows: [] },
    nodes: nodes.map((n) => ({ id: n.id, rect: drawn.rects.get(n.id) as Rect, col: 0, row: 0 })),
    groups: drawn.frames,
    width: drawn.width,
    bottom: drawn.bottom,
  };
  const byEdge = new Map(labelled.map((e): [string, EdgeText] => [e.id, { edge: e.id, name: e.label?.text ?? '' }]));

  const seated = new Set(first.map((l) => l.route));
  const unseated = drawn.routes.flatMap((r, i) => {
    const e = labelled.find((k) => k.id === r.edge);
    return e === undefined || seated.has(i) || chained.has(r.edge) ? [] : overMiddle(e, r, i, m.labelGap);
  });
  const texts = drawn.routes.flatMap((r) => byEdge.get(r.edge) ?? []);
  const outlines = drawn.frames.map(({ id, rect: r }): Route => {
    const [x2, y2] = [r.x + r.w, r.y + r.h];
    const points: [number, number][] = [
      [r.x, r.y],
      [x2, r.y],
      [x2, y2],
      [r.x, y2],
      [r.x, r.y],
    ];
    return { edge: `frame:${id}`, points, shape: 'orthogonal', fromSide: 'top', toSide: 'top' };
  });
  const lines = [...drawn.routes, ...outlines];
  const found = signEdges(grid, layout, lines, texts, [], { placed: [...first, ...unseated] });
  return { labels: found.labels, crowded: found.crowded };
}
