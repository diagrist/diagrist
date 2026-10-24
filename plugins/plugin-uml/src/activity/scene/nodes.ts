import type { Rect, Shape } from '@diagrist/core';
import { EXPANSION_SLOTS } from '../layout/expansion.js';
import { ACT, cx, cy } from '../layout/metrics.js';
import type { PlacedNode } from '../layout/place.js';
import type { ActivityArt } from '../layout/size.js';

/** Offset of the soft shadow below cards. */
const SHADOW = 3;

const round = (v: number) => Math.round(v * 100) / 100;

const path = (d: string, role = 'shape'): Shape => ({ kind: 'path', d, role });

/** Diamond of decision and merge. */
const diamond = (r: Rect) => path(`M${cx(r)} ${r.y} L${r.x + r.w} ${cy(r)} L${cx(r)} ${r.y + r.h} L${r.x} ${cy(r)} Z`);

/** Send signal: a pentagon pointing right. Accept event: a box with a notch on the left. */
function signal(r: Rect, send: boolean): Shape {
  const [x, y, w, h, tip] = [r.x, r.y, r.w, r.h, ACT.signalTip];
  return send
    ? path(`M${x} ${y} L${x + w - tip} ${y} L${x + w} ${y + h / 2} L${x + w - tip} ${y + h} L${x} ${y + h} Z`)
    : path(`M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} L${x} ${y + h} L${x + tip} ${y + h / 2} Z`);
}

/** Expansion node (UML 2.5.1, 16.12.4): a row of boxes touching each other. */
function expansionSlots(r: Rect): Shape[] {
  const step = r.w / EXPANSION_SLOTS;
  const walls = Array.from(
    { length: EXPANSION_SLOTS - 1 },
    (_, i) => `M${r.x + (i + 1) * step} ${r.y} L${r.x + (i + 1) * step} ${r.y + r.h}`,
  );
  return [{ kind: 'rect', ...r, role: 'shape' }, path(walls.join(' '), 'line')];
}

/** Flow final: a circle with a diagonal cross (UML 2.5.1, 15.3.3.2). */
function flowFinal(r: Rect): Shape[] {
  const k = (r.w / 2) * Math.SQRT1_2;
  const [x, y] = [cx(r), cy(r)];
  return [
    { kind: 'circle', cx: x, cy: y, r: r.w / 2, role: 'shape' },
    path(
      `M${round(x - k)} ${round(y - k)} L${round(x + k)} ${round(y + k)} M${round(x - k)} ${round(y + k)} L${round(x + k)} ${round(y - k)}`,
      'line',
    ),
  ];
}

function body(art: ActivityArt, r: Rect): Shape[] {
  switch (art.node) {
    case 'initial':
      return [{ kind: 'circle', cx: cx(r), cy: cy(r), r: r.w / 2, role: 'filled' }];
    case 'final':
      return [
        { kind: 'circle', cx: cx(r), cy: cy(r), r: r.w / 2, role: 'shape' },
        { kind: 'circle', cx: cx(r), cy: cy(r), r: ACT.finalCore, role: 'filled' },
      ];
    case 'flowfinal':
      return flowFinal(r);
    case 'decision':
    case 'merge':
      return [diamond(r)];
    case 'fork':
    case 'join':
      return [{ kind: 'rect', ...r, rx: 1, role: 'filled' }];
    case 'wait':
      return [path(`M${r.x} ${r.y} L${r.x + r.w} ${r.y} L${r.x} ${r.y + r.h} L${r.x + r.w} ${r.y + r.h} Z`)];
    case 'send':
    case 'accept':
      return [signal(r, art.node === 'send')];
    case 'object':
    case 'datastore':
    case 'buffer':
      return [{ kind: 'rect', ...r, role: 'shape' }];
    case 'action':
      return [{ kind: 'rect', ...r, rx: ACT.actionRx, role: 'shape' }];
    case 'expansion':
      return expansionSlots(r);
  }
}

/** Nodes that become cards in `look=cards`; start, ends, diamonds, bars and hourglass stay UML symbols. */
const CARDS = new Set<ActivityArt['node']>(['action', 'object', 'datastore', 'buffer', 'send', 'accept']);

/** The body as a card with a soft shadow; with a tone the card has an outline in it. */
function card(shapes: readonly Shape[], face: string): Shape[] {
  return shapes.flatMap((s): Shape[] => {
    if (s.kind === 'rect')
      return [
        { ...s, y: s.y + SHADOW, role: 'cardShadow' },
        { ...s, role: face },
      ];
    if (s.kind === 'path')
      return [
        { ...s, role: 'cardShadow', offset: [0, SHADOW] },
        { ...s, role: face },
      ];
    return [s];
  });
}

/** Rake of a call behavior action (UML 2.5.1, 16.3.4.1): handle, crossbar, three prongs down. */
function rake(r: Rect): Shape {
  const [l, m, rt] = [r.x, r.x + r.w / 2, r.x + r.w];
  const [top, mid, bot] = [r.y, r.y + r.h / 2, r.y + r.h];
  return path(`M${m} ${top} L${m} ${bot} M${l} ${bot} L${l} ${mid} L${rt} ${mid} L${rt} ${bot}`, 'line');
}

const text = (t: { text: string; x: number; y: number; anchor: 'start' | 'middle' | 'end' }, role: string) =>
  ({
    kind: 'text',
    x: t.x,
    y: t.y,
    text: t.text,
    role,
    font: role === 'text' ? 'act' : 'label',
    anchor: t.anchor,
  }) as const;

/** An activity node after UML 2.5.1: shape, text in the box, text beside the symbol, rake and pins. */
export function nodeShapes(p: PlacedNode, cards: boolean): Shape[] {
  const shapes = body(p.art, p.rect);
  const face = p.node.tone ? `outline-${p.node.tone}` : 'card';
  return [
    ...(cards && CARDS.has(p.art.node) ? card(shapes, face) : shapes),
    ...p.art.lines.map((l) => text(l, 'text')),
    ...(p.art.side ? [text(p.art.side, 'label')] : []),
    ...(p.art.rake ? [rake(p.art.rake)] : []),
    ...(p.art.pins ?? []).flatMap((pin): Shape[] => [
      { kind: 'rect', ...pin.rect, role: 'shape' },
      text(pin.text, 'label'),
    ]),
  ];
}
