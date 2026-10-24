import { type Point, type Rect, textWidth } from '@diagrist/core';
import { overlaps, segmentHitsRect } from '../geometry.js';
import type { Route } from '../layout.js';
import { type Board, boxOf } from '../route/boxes.js';
import { type Ellipse, ellipseOf } from '../route/snap.js';
import type { EdgeLabel, EdgeText, EndText } from './types.js';

/** Pad inside a box, air between box and node, between line and letter. */
const PAD_X = 4;
const PAD_Y = 3;
const GAP = 1;
const ASIDE = 4;
/** If the last segment is shorter than the box plus this, the box stands across and its text runs vertically. */
const ROOM = 6;
/** When the place beside the line is taken, the mark moves along the line by these. */
const SHIFTS = [0, 12, 24];

interface End {
  readonly tip: Point;
  /** Direction away from the node, axis-parallel. */
  readonly d: Point;
  readonly len: number;
  readonly node: string | undefined;
  readonly text: EndText;
}

/** Rectangle from distances along the line (`a0..a1`) and across it (`l0..l1`), measured from the end. */
function span(e: End, a0: number, a1: number, l0: number, l1: number): Rect {
  const n: Point = [Math.abs(e.d[1]), Math.abs(e.d[0])];
  const p = (a: number, l: number): Point => [e.tip[0] + e.d[0] * a + n[0] * l, e.tip[1] + e.d[1] * a + n[1] * l];
  const [x1, y1] = p(a0, l0);
  const [x2, y2] = p(a1, l1);
  return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
}

/** Does the rectangle lie on the ellipse? The nearest point of the rectangle to the centre, in the unit circle. */
export function rectMeetsEllipse(r: Rect, e: Ellipse, pad = 0): boolean {
  const nx = Math.min(Math.max(e.cx, r.x - pad), r.x + r.w + pad);
  const ny = Math.min(Math.max(e.cy, r.y - pad), r.y + r.h + pad);
  return ((nx - e.cx) / e.rx) ** 2 + ((ny - e.cy) / e.ry) ** 2 < 1;
}

function endsOf(board: Board, r: Route, text: EdgeText): End[] {
  const edge = board.tree.spec.edges.find((e) => e.id === r.edge);
  const p = r.points;
  const make = (tip: Point, next: Point, node: string | undefined, t: EndText | undefined): End[] => {
    const d: Point = [Math.sign(next[0] - tip[0]), Math.sign(next[1] - tip[1])];
    if (!t || (!t.mark && !t.box) || (d[0] === 0) === (d[1] === 0)) return [];
    return [{ tip, d, len: Math.abs(next[0] - tip[0]) + Math.abs(next[1] - tip[1]), node, text: t }];
  };
  const id = (end: string | undefined) => (end === undefined ? undefined : boxOf(board, end)?.id);
  return [
    ...make(p[0] as Point, p[1] as Point, id(edge?.from), text.from),
    ...make(p.at(-1) as Point, p.at(-2) as Point, id(edge?.to), text.to),
  ];
}

/**
 * End texts of all routes: each box sits right on its end, across the line; then each mark takes the first free
 * place beside its box or behind it, avoiding nodes, frame lines, routes and the texts in `placed`.
 */
export function endLabels(
  board: Board,
  routes: readonly Route[],
  texts: ReadonlyMap<string, EdgeText>,
  placed: readonly EdgeLabel[],
): EdgeLabel[] {
  const m = board.tree.spec.metrics;
  const size = m.labelFont.size;
  const out: EdgeLabel[] = [];
  const onNode = (b: Rect, pad: number) =>
    board.layout.nodes.some((n) => {
      const e = ellipseOf(board, n.id);
      return e ? rectMeetsEllipse(b, e, pad) : overlaps(b, n.rect, pad);
    });
  const inside = (b: Rect, g: Rect) => b.x > g.x && b.y > g.y && b.x + b.w < g.x + g.w && b.y + b.h < g.y + g.h;
  const onFrame = (b: Rect) => board.layout.groups.some((g) => overlaps(b, g.rect, 1) && !inside(b, g.rect));
  const free = (b: Rect) =>
    !onNode(b, 1) &&
    !onFrame(b) &&
    ![...placed, ...out].some((t) => overlaps(b, t.box, 2)) &&
    !routes.some((o) => o.points.slice(1).some((q, k) => segmentHitsRect(o.points[k] as Point, q, b, 1)));
  const seat = (end: End, idx: number) => {
    const vertical = end.d[0] === 0;
    const box = end.text.box;
    if (!box) return { end, idx, vertical, off: GAP, depth: 0, half: 0 };
    const bw = textWidth(box, m.labelFont) + 2 * PAD_X;
    const bh = size + 2 * PAD_Y;
    const along = !vertical && end.len >= GAP + bw + ROOM;
    const depth = along ? bw : bh;
    const half = (along ? bh : bw) / 2;
    const own = ellipseOf(board, end.node);
    let off = own ? -GAP : GAP;
    while (own && off < 4 * bh && rectMeetsEllipse(span(end, off + depth / 2, off + depth, -half, half), own)) off++;
    const frame = span(end, off, off + depth, -half, half);
    const at = { x: frame.x + frame.w / 2, y: frame.y + frame.h / 2 + Math.round(size * 0.36) };
    out.push({
      text: box,
      ...at,
      anchor: 'middle',
      box: frame,
      route: idx,
      part: 'box',
      frame: { rect: frame, turn: !vertical && !along },
    });
    return { end, idx, vertical, off, depth, half };
  };
  const seats = routes.flatMap((r, idx) => {
    const text = texts.get(r.edge);
    return text && r.points.length > 1 ? endsOf(board, r, text).map((end) => seat(end, idx)) : [];
  });
  for (const { end, idx, vertical, off, depth, half } of seats) {
    const mark = end.text.mark;
    if (!mark) continue;
    const mw = textWidth(mark, m.labelFont);
    const mh = size + 2;
    const [ae, le] = vertical ? [mh, mw] : [mw, mh];
    const mid = off + depth / 2;
    const beside = (s: number) => span(end, mid - ae / 2, mid + ae / 2, s * (half + ASIDE), s * (half + ASIDE + le));
    const beyond = (s: number, k: number) => {
      const a = off + depth + ASIDE + k;
      return span(end, a, a + ae, s * ASIDE, s * (ASIDE + le));
    };
    const candidates = [
      ...(end.text.box ? [beside(1), beside(-1)] : []),
      ...SHIFTS.flatMap((k) => [beyond(1, k), beyond(-1, k)]),
    ];
    const b = candidates.find(free) ?? (candidates[0] as Rect);
    out.push({ text: mark, x: b.x + b.w / 2, y: b.y + size, anchor: 'middle', box: b, route: idx, part: 'mark' });
  }
  return out;
}
