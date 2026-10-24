import type { Rect, Shape } from '@diagrist/core';
import type { Spot } from '../layout/art.js';
import type { NodeShape } from '../model/types.js';

const BADGE = { w: 24, h: 16, rx: 8 } as const;
const REPLICA = { w: 24, h: 13, rx: 3 } as const;
const TEXT_DY = 3.5;
/** Corner radius of a plain box. */
export const BODY_RX = 8;
const DB_RY = 9;
const QUEUE_INSET = 8;
const STORE_FOLD = 14;
const APP = { bar: 12, dot: 1.5, x: 8, gap: 7 } as const;
const CLOCK = { r: 8, hand: 5 } as const;

/** A flow number in a rounded tag, centred on (x, y). */
export function badgeShapes(n: number, x: number, y: number, accent: boolean): Shape[] {
  return [
    {
      kind: 'rect',
      x: x - BADGE.w / 2,
      y: y - BADGE.h / 2,
      w: BADGE.w,
      h: BADGE.h,
      rx: BADGE.rx,
      role: accent ? 'badgeAccent' : 'badge',
    },
    { kind: 'text', x, y: y + TEXT_DY, text: `(${n})`, role: 'badgeText', font: 'badge', anchor: 'middle' },
  ];
}

/** The tag of replicas such as `x3`, centred on the anchor. */
export function replicaShapes(text: string, at: Spot): Shape[] {
  return [
    {
      kind: 'rect',
      x: at.x - REPLICA.w / 2,
      y: at.y - REPLICA.h / 2,
      w: REPLICA.w,
      h: REPLICA.h,
      rx: REPLICA.rx,
      role: 'replica',
    },
    { kind: 'text', x: at.x, y: at.y + TEXT_DY, text, role: 'replicaText', font: 'replica', anchor: 'middle' },
  ];
}

/** The clock of a job, centred on the anchor. */
export function clockShapes(at: Spot, detail: string): Shape[] {
  return [
    { kind: 'circle', cx: at.x, cy: at.y, r: CLOCK.r, role: detail },
    { kind: 'path', d: `M${at.x} ${at.y - CLOCK.hand} L${at.x} ${at.y} L${at.x + CLOCK.hand} ${at.y}`, role: detail },
  ];
}

const box = (r: Rect, body: string, rx: number): Shape => ({ kind: 'rect', ...r, rx, role: body });

function cylinder(r: Rect, body: string, detail: string): Shape[] {
  const top = r.y + DB_RY;
  const base = r.y + r.h - DB_RY;
  const right = r.x + r.w;
  const arc = `${r.w / 2} ${DB_RY} 0 0 1`;
  return [
    {
      kind: 'path',
      d: `M${r.x} ${top} A${arc} ${right} ${top} L${right} ${base} A${arc} ${r.x} ${base} Z`,
      role: body,
    },
    { kind: 'path', d: `M${r.x} ${top} A${r.w / 2} ${DB_RY} 0 0 0 ${right} ${top}`, role: detail },
  ];
}

function folded(r: Rect, body: string, detail: string): Shape[] {
  const right = r.x + r.w;
  const fold = right - STORE_FOLD;
  const knee = r.y + STORE_FOLD;
  const bottom = r.y + r.h;
  return [
    {
      kind: 'path',
      d: `M${r.x} ${r.y} L${fold} ${r.y} L${right} ${knee} L${right} ${bottom} L${r.x} ${bottom} Z`,
      role: body,
    },
    { kind: 'path', d: `M${fold} ${r.y} L${fold} ${knee} L${right} ${knee}`, role: detail },
  ];
}

function windowed(r: Rect, body: string, detail: string, rx: number): Shape[] {
  const bar = r.y + APP.bar;
  const dots = [0, 1, 2].map(
    (i): Shape => ({ kind: 'circle', cx: r.x + APP.x + i * APP.gap, cy: r.y + APP.bar / 2, r: APP.dot, role: detail }),
  );
  return [box(r, body, rx), { kind: 'line', x1: r.x, y1: bar, x2: r.x + r.w, y2: bar, role: detail }, ...dots];
}

/** The body of a node: a box with corners of radius `rx`, or the form of `shape`; `detail` draws the inner lines. */
export function bodyShapes(
  shape: NodeShape | undefined,
  r: Rect,
  body: string,
  detail: string,
  rx: number = BODY_RX,
): Shape[] {
  switch (shape) {
    case 'db':
      return cylinder(r, body, detail);
    case 'store':
      return folded(r, body, detail);
    case 'queue': {
      const inner = r.x + QUEUE_INSET;
      return [box(r, body, rx), { kind: 'line', x1: inner, y1: r.y, x2: inner, y2: r.y + r.h, role: detail }];
    }
    case 'app':
      return windowed(r, body, detail, rx);
    default:
      return [box(r, body, rx)];
  }
}
