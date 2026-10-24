import { type Point, type Rect, textWidth } from '@diagrist/core';
import type { Route } from '../layout.js';
import { type Board, boxOf } from '../route/boxes.js';
import { ellipseOf } from '../route/snap.js';
import { isFree, rectMeetsEllipse } from './room.js';
import type { EdgeLabel, EdgeText, EndText } from './types.js';

/** Pad inside a box, air between box and node, between line and letter. */
const PAD_X = 4;
const PAD_Y = 3;
const GAP = 1;
const ASIDE = 4;
/** If the last segment is shorter than the box plus this, the box stands across and its text runs vertically. */
const ROOM = 6;
/** When the place beside the line is taken, the mark moves along the line by these. */
const SHIFTS = [0, 12, 24] as const;
/** The baseline of a text in a box lies this share of the font size below the middle of the box. */
const BASELINE = 0.36;
/** A mark is as high as its font size and this much more, so neighbouring marks keep a little air. */
const MARK_LEADING = 2;

interface End {
  readonly tip: Point;
  /** Direction away from the node, axis-parallel. */
  readonly direction: Point;
  readonly length: number;
  readonly node: string | undefined;
  readonly text: EndText;
  /** Index of the route the end belongs to. */
  readonly route: number;
}

/**
 * Where the box of an end sits, as distances from the tip: `offset` along the line to the box, `depth` of the box
 * along the line and `half` of its width across. An end without box keeps `GAP` and no size, so its mark sits behind
 * the tip.
 */
interface Seat {
  readonly end: End;
  readonly vertical: boolean;
  readonly offset: number;
  readonly depth: number;
  readonly half: number;
}

/** Rectangle from distances along the line (`from..to`) and across it (`left..right`), measured from the end. */
function span(end: End, from: number, to: number, left: number, right: number): Rect {
  const [dx, dy] = end.direction;
  const across: Point = [Math.abs(dy), Math.abs(dx)];
  const at = (along: number, side: number): Point => [
    end.tip[0] + dx * along + across[0] * side,
    end.tip[1] + dy * along + across[1] * side,
  ];
  const [x1, y1] = at(from, left);
  const [x2, y2] = at(to, right);
  return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
}

/** The ends of a route that carry a text, first its start, then its end; an end on a slanted segment has none. */
function endsOf(board: Board, route: Route, index: number, text: EdgeText): End[] {
  const edge = board.tree.spec.edges.find((e) => e.id === route.edge);
  const points = route.points;
  const end = (tip?: Point, next?: Point, node?: string, endText?: EndText): End[] => {
    if (!tip || !next || !endText || (!endText.mark && !endText.box)) return [];
    const direction: Point = [Math.sign(next[0] - tip[0]), Math.sign(next[1] - tip[1])];
    if ((direction[0] === 0) === (direction[1] === 0)) return [];
    const length = Math.abs(next[0] - tip[0]) + Math.abs(next[1] - tip[1]);
    return [{ tip, direction, length, node, text: endText, route: index }];
  };
  const id = (node: string | undefined) => (node === undefined ? undefined : boxOf(board, node)?.id);
  return [
    ...end(points[0], points[1], id(edge?.from), text.from),
    ...end(points.at(-1), points.at(-2), id(edge?.to), text.to),
  ];
}

/**
 * The box of an end, right on the end and across the line: along the line when the last segment has room for it,
 * else across it with its text turned. On an ellipse it moves out until it leaves the curve.
 */
function boxSeat(board: Board, end: End): { readonly seat: Seat; readonly label?: EdgeLabel } {
  const vertical = end.direction[0] === 0;
  const box = end.text.box;
  if (!box) return { seat: { end, vertical, offset: GAP, depth: 0, half: 0 } };
  const font = board.tree.spec.metrics.labelFont;
  const width = textWidth(box, font) + 2 * PAD_X;
  const height = font.size + 2 * PAD_Y;
  const along = !vertical && end.length >= GAP + width + ROOM;
  const depth = along ? width : height;
  const half = (along ? height : width) / 2;
  const own = ellipseOf(board, end.node);
  let offset = own ? -GAP : GAP;
  while (
    own &&
    offset < 4 * height &&
    rectMeetsEllipse(span(end, offset + depth / 2, offset + depth, -half, half), own)
  )
    offset++;
  const frame = span(end, offset, offset + depth, -half, half);
  const label: EdgeLabel = {
    text: box,
    x: frame.x + frame.w / 2,
    y: frame.y + frame.h / 2 + Math.round(font.size * BASELINE),
    anchor: 'middle',
    box: frame,
    route: end.route,
    part: 'box',
    frame: { rect: frame, turn: !vertical && !along },
  };
  return { seat: { end, vertical, offset, depth, half }, label };
}

/**
 * The mark of an end at the first free place: beside its box on either side, then behind it, moving along the line
 * by `SHIFTS`. When none is free it takes the first place anyway.
 */
function markSeat(board: Board, seat: Seat, free: (rect: Rect) => boolean): EdgeLabel | undefined {
  const { end, vertical, offset, depth, half } = seat;
  const mark = end.text.mark;
  if (!mark) return undefined;
  const font = board.tree.spec.metrics.labelFont;
  const width = textWidth(mark, font);
  const height = font.size + MARK_LEADING;
  const [along, across] = vertical ? [height, width] : [width, height];
  const middle = offset + depth / 2;
  const beside = (side: number) =>
    span(end, middle - along / 2, middle + along / 2, side * (half + ASIDE), side * (half + ASIDE + across));
  const behind = (side: number, shift: number) => {
    const from = offset + depth + ASIDE + shift;
    return span(end, from, from + along, side * ASIDE, side * (ASIDE + across));
  };
  const candidates = [
    ...(end.text.box ? [beside(1), beside(-1)] : []),
    ...SHIFTS.flatMap((shift) => [behind(1, shift), behind(-1, shift)]),
  ];
  const first = end.text.box ? beside(1) : behind(1, SHIFTS[0]);
  const rect = candidates.find(free) ?? first;
  return {
    text: mark,
    x: rect.x + rect.w / 2,
    y: rect.y + font.size,
    anchor: 'middle',
    box: rect,
    route: end.route,
    part: 'mark',
  };
}

/**
 * End texts of all routes: each box sits right on its end, across the line; then each mark takes the first free
 * place beside its box or behind it, avoiding nodes, frame lines, routes, the texts in `placed` and those placed
 * before it.
 */
export function endLabels(
  board: Board,
  routes: readonly Route[],
  texts: ReadonlyMap<string, EdgeText>,
  placed: readonly EdgeLabel[],
): EdgeLabel[] {
  const ends = routes.flatMap((route, index) => {
    const text = texts.get(route.edge);
    return text && route.points.length > 1 ? endsOf(board, route, index, text) : [];
  });
  const boxes = ends.map((end) => boxSeat(board, end));
  const labels = boxes.flatMap(({ label }) => (label ? [label] : []));
  for (const { seat } of boxes) {
    const mark = markSeat(board, seat, (rect) => isFree(board, routes, [...placed, ...labels], rect));
    if (mark) labels.push(mark);
  }
  return labels;
}
