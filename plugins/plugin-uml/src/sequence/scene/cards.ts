import { type NodeForm, type Rect, rectForm, type Shape, type Tone } from '@diagrist/core';
import type { Participant } from '../diagram.js';
import { isFigure } from '../layout/text.js';
import type { SeqHeadArt, SeqShape } from '../layout/types.js';
import { shape } from './shapes.js';

/**
 * The card look (`look=cards`): heads as cards in the tone of their lifeline, bars tinted in it, fragments with
 * rounded frames. Lines, arrowheads and labels stay those of the notation; only drawing changes, not layout. A
 * lifeline of a coloured area without `tone=` is painted by its area (ADR 0033): its head is a light card and its bars
 * those of the notation, which the area tints, outlines or stripes as it does every element, and as the legend shows.
 */
const RADIUS = 8;
const SHADOW = 3;
const DEFAULT_TONE: Tone = 'slate';

const toneOf = (p: Participant | undefined): Tone => p?.tone ?? DEFAULT_TONE;

/** Soft shadow and card; `role` picks the face. */
function cardBody(r: Rect, role: string): Shape[] {
  return [
    { kind: 'rect', ...r, y: r.y + SHADOW, rx: RADIUS, role: 'cardShadow' },
    { kind: 'rect', ...r, rx: RADIUS, role },
  ];
}

/** Frame with a square corner at the top left, where its tag sits; the other corners rounded. */
function tabbedFrame(r: Rect, rx: number): string {
  const [x, y, w, h] = [r.x, r.y, r.w, r.h];
  const [rt, b] = [x + w, y + h];
  return `M${x} ${y} L${rt - rx} ${y} Q${rt} ${y} ${rt} ${y + rx} L${rt} ${b - rx} Q${rt} ${b} ${rt - rx} ${b} L${x + rx} ${b} Q${x} ${b} ${x} ${b - rx} Z`;
}

/** Whether the area of a lifeline paints it: it lies in a coloured area and names no tone of its own. */
export type Painted = (lifeline: string) => boolean;

/** Head of a lifeline its area paints: a light card, dashed when external, everything on it as in the notation. */
function areaHeadShape(s: SeqShape): Shape[] {
  if ((s.kind !== 'rect' && s.kind !== 'path') || (s.role !== 'head' && s.role !== 'headExternal')) return [shape(s)];
  const face = s.role === 'head' ? 'cardBox' : 'cardRef';
  if (s.kind === 'rect') return cardBody(s.rect, face);
  return [
    { kind: 'path', d: s.d, role: 'cardShadow', offset: [0, SHADOW] },
    { kind: 'path', d: s.d, role: face },
  ];
}

/** Head of a lifeline: box, cylinder and tube filled with white text, figures in the tone. */
function headShape(s: SeqShape, p: Participant): Shape[] {
  const tone = toneOf(p);
  const filled = !isFigure(p) && p.external !== true;
  const face = filled ? `tone-${tone}` : 'cardRef';
  if (s.kind === 'rect' && (s.role === 'head' || s.role === 'headExternal')) return cardBody(s.rect, face);
  if (s.kind === 'path' && (s.role === 'head' || s.role === 'headExternal'))
    return [
      { kind: 'path', d: s.d, role: 'cardShadow', offset: [0, SHADOW] },
      { kind: 'path', d: s.d, role: face },
    ];
  if (s.kind === 'path' && s.role === 'stroke')
    return [{ kind: 'path', d: s.d, role: filled ? 'cardEdge' : `outline-${tone}` }];
  if (s.kind === 'circle' && s.role === 'figure')
    return [
      { kind: 'circle', cx: s.cx, cy: s.cy, r: s.r, role: p.kind === 'actor' ? `tone-${tone}` : `outline-${tone}` },
    ];
  if (s.kind === 'text' && filled && (s.role === 'name' || s.role === 'stereo'))
    return [
      {
        kind: 'text',
        ...s.at,
        text: s.text,
        role: s.role === 'name' ? 'cardName' : 'cardStereo',
        font: s.role === 'name' ? 'name' : 'note',
        anchor: s.anchor,
      },
    ];
  return [shape(s)];
}

/**
 * The form of a head's body, plain or as a card: a figure or robustness symbol is a symbol, a database a cylinder, a
 * queue a lying tube, any other a box, rounded as a card.
 */
export function headForm(p: Participant, cards: boolean): NodeForm {
  if (isFigure(p)) return 'symbol';
  if (p.kind === 'database') return 'cylinder';
  if (p.kind === 'queue') return 'queue';
  return rectForm(cards ? RADIUS : 0);
}

/** Heads as cards, each in its group `node-<id>`. */
export function cardHeads(
  heads: readonly SeqHeadArt[],
  participants: ReadonlyMap<string, Participant>,
  id: (head: string) => string,
  painted: Painted,
): Shape[] {
  return heads.map((h): Shape => {
    const p = participants.get(h.id);
    const draw = (s: SeqShape) => (p && painted(h.id) ? areaHeadShape(s) : p ? headShape(s, p) : [shape(s)]);
    const children = h.shapes.flatMap(draw);
    return { kind: 'group', id: id(h.id), children };
  });
}

/** The head whose centre is nearest to `x`: the lifeline a bar at `x` lies on. */
export function nearestHead(x: number, heads: readonly SeqHeadArt[]): SeqHeadArt | undefined {
  let best: SeqHeadArt | undefined;
  for (const h of heads)
    if (!best || Math.abs(h.rect.x + h.rect.w / 2 - x) < Math.abs(best.rect.x + best.rect.w / 2 - x)) best = h;
  return best;
}

/** Bars, fragments, references, notes and dividers as cards; everything else as in the notation. */
export function cardShapes(
  shapes: readonly SeqShape[],
  heads: readonly SeqHeadArt[],
  participants: ReadonlyMap<string, Participant>,
  painted: Painted,
): Shape[] {
  return shapes.flatMap((s): Shape[] => {
    if (s.kind === 'rect' && s.role === 'activation') {
      const head = nearestHead(s.rect.x + s.rect.w / 2, heads);
      if (head !== undefined && painted(head.id)) return [shape(s)];
      const tone = toneOf(head === undefined ? undefined : participants.get(head.id));
      return [
        { kind: 'rect', ...s.rect, role: 'knockout' },
        { kind: 'rect', ...s.rect, role: `tint-${tone}` },
      ];
    }
    if (s.kind === 'rect' && s.role === 'frame')
      return [{ kind: 'path', d: tabbedFrame(s.rect, RADIUS), role: 'cardFrame' }];
    if (s.kind === 'rect' && s.role === 'ref')
      return [{ kind: 'path', d: tabbedFrame(s.rect, RADIUS), role: 'cardBox' }];
    if (s.kind === 'path' && s.role === 'tag') return [{ kind: 'path', d: s.d, role: 'cardTag' }];
    if (s.kind === 'path' && s.role === 'note') return [{ kind: 'path', d: s.d, role: 'cardBox' }];
    if (s.kind === 'rect' && s.role === 'tag') return [{ kind: 'rect', ...s.rect, rx: RADIUS / 2, role: 'cardTag' }];
    return [shape(s)];
  });
}
