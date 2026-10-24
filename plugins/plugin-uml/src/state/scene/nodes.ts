import { domId, type Rect, type Shape } from '@diagrist/core';
import { cardBody, headPath } from '../../shared/cards.js';
import type { Vertex } from '../diagram.js';
import { stateArt } from '../layout/box.js';
import { STATE as S } from '../layout/metrics.js';
import type { PointName } from '../layout/points/names.js';
import type { StateModel } from '../model.js';

const circle = (cx: number, cy: number, r: number, role: string): Shape => ({ kind: 'circle', cx, cy, r, role });

/** The symbol of a pseudostate after UML 2.5.1, derived from its rectangle. */
function pseudoShapes(v: Vertex, r: Rect): Shape[] {
  const { x, y, w, h } = r;
  const [cx, cy] = [x + w / 2, y + h / 2];
  switch (v.kind) {
    case 'initial':
    case 'junction':
      return [circle(cx, cy, w / 2, 'filled')];
    case 'final':
      return [circle(cx, cy, w / 2, 'box'), circle(cx, cy, S.finalDot, 'filled')];
    case 'choice':
      return [{ kind: 'path', d: `M${cx} ${y} L${x + w} ${cy} L${cx} ${y + h} L${x} ${cy} Z`, role: 'box' }];
    case 'history':
      return [
        circle(cx, cy, w / 2, 'box'),
        { kind: 'text', x: cx, y: cy + 4, text: v.deep ? 'H*' : 'H', role: 'name', font: 'name', anchor: 'middle' },
      ];
    case 'fork':
    case 'join':
      return [{ kind: 'rect', x, y, w, h, role: 'filled' }];
    case 'entrypoint':
      return [circle(cx, cy, w / 2, 'box')];
    case 'exitpoint': {
      const d = (w / 2) * Math.SQRT1_2;
      return [
        circle(cx, cy, w / 2, 'box'),
        { kind: 'line', x1: cx - d, y1: cy - d, x2: cx + d, y2: cy + d, role: 'divider' },
        { kind: 'line', x1: cx - d, y1: cy + d, x2: cx + d, y2: cy - d, role: 'divider' },
      ];
    }
    case 'terminate':
      return [
        { kind: 'line', x1: x, y1: y, x2: x + w, y2: y + h, role: 'divider' },
        { kind: 'line', x1: x, y1: y + h, x2: x + w, y2: y, role: 'divider' },
      ];
    default:
      return [];
  }
}

/** The submachine symbol: two small states joined by a line. */
function submachineIcon(r: Rect): Shape[] {
  const box = r.h;
  const y = r.y + r.h / 2;
  return [
    { kind: 'rect', x: r.x, y: r.y, w: box, h: r.h, rx: r.h / 3, role: 'box' },
    { kind: 'rect', x: r.x + r.w - box, y: r.y, w: box, h: r.h, rx: r.h / 3, role: 'box' },
    { kind: 'line', x1: r.x + box, y1: y, x2: r.x + r.w - box, y2: y, role: 'divider' },
  ];
}

/** Where a point sits on the bottom edge at the submachine symbol, the symbol moves left of it. */
function clearIcon(icon: Rect, host: Rect, points: readonly Rect[]): Rect {
  let out = icon;
  const below = points.filter((p) => Math.abs(p.y + p.h / 2 - (host.y + host.h)) < 1).sort((a, b) => b.x - a.x);
  for (const p of below)
    if (p.x - S.subInset < out.x + out.w && p.x + p.w + S.subInset > out.x)
      out = { ...out, x: p.x - S.subInset - out.w };
  return out;
}

/**
 * A vertex in its group `node-<id>`: a state as a rounded box with name and compartment, in the card look a card
 * with a toned name field; a pseudostate as its symbol with its name beside it.
 */
export function vertexShape(
  m: StateModel,
  v: Vertex,
  r: Rect,
  cards: boolean,
  points: readonly Rect[],
  name?: PointName,
): Shape {
  const art = stateArt(m, v, r);
  const card = cards && v.kind === 'state';
  const body = v.emph ? 'boxEmph' : card ? 'card' : 'box';
  const box: Shape[] =
    v.kind !== 'state'
      ? []
      : card
        ? [
            ...cardBody(r, body, S.radius),
            {
              kind: 'path',
              d: headPath(r, art.divider === undefined ? r.h : art.divider - r.y, S.radius),
              role: `tone-${v.tone ?? 'slate'}`,
            },
          ]
        : [{ kind: 'rect', ...r, rx: S.radius, role: body }];
  const label = name ?? (art.name ? { ...art.name } : undefined);
  const text: Shape[] = label
    ? [
        {
          kind: 'text',
          x: label.x,
          y: label.y,
          text: label.text,
          role: card ? 'cardName' : v.kind === 'state' ? 'name' : 'noteText',
          font: v.kind === 'state' ? 'name' : 'note',
          anchor: label.anchor,
        },
      ]
    : [];
  const icon = art.submachine ? clearIcon(art.submachine, r, points) : undefined;
  const children: Shape[] = [
    ...box,
    ...pseudoShapes(v, r),
    ...text,
    ...(art.divider !== undefined && !card
      ? [{ kind: 'line' as const, x1: r.x, y1: art.divider, x2: r.x + r.w, y2: art.divider, role: 'divider' }]
      : []),
    ...art.lines.map(
      (l): Shape => ({ kind: 'text', x: l.x, y: l.y, text: l.text, role: 'member', font: 'member', anchor: 'start' }),
    ),
    ...(icon ? submachineIcon(icon) : []),
  ];
  return { kind: 'group', id: domId.node(v.id), children };
}
