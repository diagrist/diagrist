import type { Rect, Shape } from '@diagrist/core';
import type { Tone } from '../../theme.js';
import type { Participant } from '../diagram.js';
import { isFigure } from '../layout/text.js';
import type { SeqHeadArt, SeqShape } from '../layout/types.js';
import { shape } from './shapes.js';

/**
 * The card look (`look=cards`): heads as cards in the tone of their lifeline, bars tinted in it, fragments with
 * rounded frames. Lines, arrowheads and labels stay those of the notation; only drawing changes, not layout.
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

/** Heads as cards, each in its group `node-<id>`. */
export function cardHeads(
  heads: readonly SeqHeadArt[],
  participants: ReadonlyMap<string, Participant>,
  id: (head: string) => string,
): Shape[] {
  return heads.map((h): Shape => {
    const p = participants.get(h.id);
    const children = p ? h.shapes.flatMap((s) => headShape(s, p)) : h.shapes.map(shape);
    return { kind: 'group', id: id(h.id), children };
  });
}

/** Tone of the lifeline a bar lies on: the one whose head centre is nearest. */
function toneAt(x: number, heads: readonly SeqHeadArt[], participants: ReadonlyMap<string, Participant>): Tone {
  let best: SeqHeadArt | undefined;
  for (const h of heads)
    if (!best || Math.abs(h.rect.x + h.rect.w / 2 - x) < Math.abs(best.rect.x + best.rect.w / 2 - x)) best = h;
  return toneOf(best === undefined ? undefined : participants.get(best.id));
}

/** Bars, fragments, references, notes and dividers as cards; everything else as in the notation. */
export function cardShapes(
  shapes: readonly SeqShape[],
  heads: readonly SeqHeadArt[],
  participants: ReadonlyMap<string, Participant>,
): Shape[] {
  return shapes.flatMap((s): Shape[] => {
    if (s.kind === 'rect' && s.role === 'activation') {
      const tone = toneAt(s.rect.x + s.rect.w / 2, heads, participants);
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
