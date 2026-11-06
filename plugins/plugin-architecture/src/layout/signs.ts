import type { Rect } from '@diagrist/core';
import {
  type EdgeLabel,
  type EdgeText,
  fitFrames,
  type GridLayout,
  type GridSpec,
  labelEdges,
  type Route,
  seatMarks,
  signEdges,
} from '@diagrist/layout-grid';
import type { Look } from '../looks/look.js';
import type { ArchitectureModel } from '../model/types.js';
import {
  type Badge,
  MARK,
  type Mark,
  markRect,
  markSpots,
  marksInside,
  marksOf,
  NUMBER_ROOM,
  NUMBER_SIZE,
  TEXT_GAP,
} from './marks.js';
import { placeNodeMarks } from './node-marks.js';

/** The texts of the edges, the flow numbers with the rectangles they cover, and the decision marks of a picture. */
export interface Signs {
  /** The grid after frames grew around routes and labels, in an adaptive grid; else the grid as placed. */
  readonly grid: GridLayout;
  readonly labels: readonly EdgeLabel[];
  readonly badges: readonly Badge[];
  readonly numbered: readonly { readonly route: number; readonly rect: Rect }[];
  readonly marks: readonly Mark[];
  /** Routes whose texts found no clear spot in a channel grid, for its gutters to grow (`gutterRoom`). */
  readonly crowded: readonly number[];
}

/** The room texts keep from a flow number in a channel grid, besides the pad every sign keeps. */
const SIGN_ROOM = 2;

/**
 * Flow numbers, decision marks and edge texts. A channel grid sets numbers first, clear of boxes, frames, foreign
 * lines and marks, and then the texts clear of all of them; an adaptive grid sets the texts first, lets frames grow
 * around them, and seats numbers on their line clear of its texts where the look asks for it.
 */
export function signsOf(
  model: ArchitectureModel,
  spec: GridSpec,
  placed: GridLayout,
  routes: readonly Route[],
  texts: readonly EdgeText[],
  look: Look,
): Signs {
  const { metrics: m, options: o } = look;
  const size = NUMBER_SIZE[o.numbers.form];
  const onLine = o.edgeText.place === 'onLine' ? { onLine: { pad: TEXT_GAP, avoid: [] } } : {};
  const rectOf = (b: Badge) => ({ x: b.x - size.w / 2, y: b.y - size.h / 2, ...size });
  const inside = (grid: GridLayout, aside: readonly Mark[]) => {
    const rects = new Map(grid.nodes.map((p) => [p.id, p.rect]));
    return o.marks === 'inside' ? marksInside(aside, model.nodes, rects) : [...aside];
  };
  if (spec.channels === true) {
    const rects = new Map(placed.nodes.map((p) => [p.id, p.rect]));
    const { badges: free, marks: aside } = marksOf(model, routes, rects, m);
    const owners = new Map(model.nodes.flatMap((n) => (n.mark ? [[n.mark, n.id] as const] : [])));
    const heads = spec.groups.flatMap((g) => {
      const h = g.head;
      const r = placed.groups.find((p) => p.id === g.id)?.rect;
      if (!h || !r) return [];
      return [{ x: (h.origin === 'middle' ? r.x + r.w / 2 : r.x) + h.x, y: r.y + h.y, w: h.w, h: h.h }];
    });
    const marks = o.marks === 'inside' ? inside(placed, aside) : placeNodeMarks(aside, owners, placed, routes, heads);
    const mark = { ...size, room: SIGN_ROOM };
    const onEdges = marks.filter((k) => k.route !== undefined);
    const avoid = marks.filter((k) => k.route === undefined).map(markRect);
    const at = onEdges.map((k) => ({ route: k.route ?? 0, spots: markSpots(routes[k.route ?? 0]?.points ?? []) }));
    const pins = { ...MARK, at };
    const flat = o.edgeText.flat;
    const signed = signEdges(spec, placed, routes, texts, free, { preferFlat: flat, ...onLine, avoid, mark, pins });
    const moved = marks.map((k) => {
      const spot = signed.pins[onEdges.indexOf(k)];
      return spot ? { ...k, x: spot[0], y: spot[1] } : k;
    });
    const numbered = signed.marks.map((b) => ({ route: b.route, rect: rectOf(b) }));
    const boxes = [...signed.labels, ...numbered.map((n) => ({ route: n.route, box: n.rect }))];
    return {
      grid: spec.adaptive ? fitFrames(spec, placed, routes, boxes) : placed,
      labels: signed.labels,
      badges: signed.marks,
      numbered,
      marks: moved,
      crowded: signed.crowded,
    };
  }
  const labelled = labelEdges(spec, placed, routes, texts, { preferFlat: o.edgeText.flat, ...onLine });
  const grid = spec.adaptive ? fitFrames(spec, placed, routes, labelled) : placed;
  const found = spec.adaptive
    ? signEdges(spec, grid, routes, texts, [], { preferFlat: o.edgeText.flat, ...onLine, placed: labelled }).labels
    : labelled;
  const rects = new Map(grid.nodes.map((p) => [p.id, p.rect]));
  const { badges: numbers, marks: aside } = marksOf(model, routes, rects, m);
  const { marks: badges, labels } =
    o.numbers.seat === 'seated'
      ? seatMarks(numbers, found, routes, { r: size.w / 2, room: NUMBER_ROOM })
      : { marks: numbers, labels: found };
  const numbered = badges.map((b) => ({ route: b.route, rect: rectOf(b) }));
  return { grid, labels, badges, numbered, marks: inside(grid, aside), crowded: [] };
}
