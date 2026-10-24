import type { Rect, Shape, Tone } from '@diagrist/core';
import type { ActorArt, Oval, UcText, UseCaseArt } from '../layout/art.js';

/** Offset of the soft shadow below shapes in the card look, and the corner radius of cards. */
const CARD = { shadow: 3, radius: 8 } as const;

/** What a shape needs to know besides its art: the look, its tone and whether it is highlighted. */
export interface Paint {
  readonly cards: boolean;
  readonly tone?: Tone;
  readonly emph?: boolean;
}

const texts = (lines: readonly UcText[], role: string, font: string): Shape[] =>
  lines.map((t) => ({ kind: 'text', x: t.x, y: t.y, text: t.text, role, font, anchor: 'middle' }));

/** An ellipse as two half arcs. */
export const ellipsePath = (a: Oval): string =>
  `M${a.cx - a.rx} ${a.cy} A${a.rx} ${a.ry} 0 1 0 ${a.cx + a.rx} ${a.cy} A${a.rx} ${a.ry} 0 1 0 ${a.cx - a.rx} ${a.cy} Z`;

const tone = (p: Paint): Tone => p.tone ?? 'slate';

/** A card with its soft shadow. */
const card = (r: Rect, role: string): Shape[] => [
  { kind: 'rect', ...r, y: r.y + CARD.shadow, rx: CARD.radius, role: 'cardShadow' },
  { kind: 'rect', ...r, rx: CARD.radius, role },
];

/** A use case: outline, small ellipse of the classifier, stereotype, name and compartment. */
export function useCaseShapes(a: UseCaseArt, p: Paint): Shape[] {
  const outline = p.emph ? 'emph' : p.cards ? `outline-${tone(p)}` : 'outline';
  const d = ellipsePath(a);
  const body: Shape[] = a.box
    ? p.cards
      ? card(a.box, outline)
      : [{ kind: 'rect', ...a.box, role: outline }]
    : [
        ...(p.cards ? [{ kind: 'path' as const, d, role: 'cardShadow', offset: [0, CARD.shadow] as const }] : []),
        { kind: 'path', d, role: outline },
      ];
  return [
    ...body,
    ...(a.icon
      ? [{ kind: 'path' as const, d: ellipsePath(a.icon), role: p.cards ? `outline-${tone(p)}` : 'outline' }]
      : []),
    ...(a.stereotype ? texts([a.stereotype], 'stereo', 'stereo') : []),
    ...texts(a.name, 'name', 'ucName'),
    ...(a.rule ? [{ kind: 'line' as const, ...a.rule, role: p.cards ? `tint-${tone(p)}` : 'rule' }] : []),
    ...(a.heading ? texts([a.heading], 'stereo', 'stereo') : []),
    ...texts(a.points, 'member', 'member'),
  ];
}

/** An actor: the stick figure with its role below, or the box of a system actor. */
export function actorShapes(a: ActorArt, p: Paint): Shape[] {
  if (a.box) {
    const head = p.emph || !p.cards;
    return [
      ...(p.cards
        ? card(a.box, p.emph ? 'emph' : `tone-${tone(p)}`)
        : [{ kind: 'rect' as const, ...a.box, role: p.emph ? 'emph' : 'outline' }]),
      ...(a.stereotype ? texts([a.stereotype], head ? 'stereo' : 'cardStereo', 'stereo') : []),
      ...texts(a.name, head ? (p.cards ? 'boldName' : 'name') : 'cardName', p.cards ? 'name' : 'ucName'),
    ];
  }
  const f = a.figure;
  if (!f) return texts(a.name, 'name', 'ucName');
  const limb = p.emph ? 'limbEmph' : p.cards ? `outline-${tone(p)}` : 'limb';
  const head: Shape = { kind: 'circle', ...f.head, role: p.emph ? 'emph' : p.cards ? `tone-${tone(p)}` : 'outline' };
  const limbs: Shape[] = [f.body, f.arms, ...f.legs].map((s) => ({ kind: 'line', ...s, role: limb }));
  return [
    ...(p.cards ? [...limbs, head] : [head, ...limbs]),
    ...(p.cards ? texts(a.name, 'boldName', 'name') : texts(a.name, 'name', 'ucName')),
  ];
}
