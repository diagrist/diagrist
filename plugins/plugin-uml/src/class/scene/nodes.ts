import { domId, type Rect, type Shape, type Tone } from '@diagrist/core';
import { CARD, cardBody, headPath, tabbedFrame } from '../../shared/cards.js';
import type { Classifier, NaryAssociation } from '../diagram.js';
import { type ClassArt, type ClassText, classArt } from '../layout/box.js';
import { CLASS, tabWidth } from '../layout/metrics.js';

function text(t: ClassText, role: string, font: string, anchor: 'start' | 'middle'): Shape[] {
  const line = t.underline;
  return [
    { kind: 'text', x: t.x, y: t.y, text: t.text, role: t.italic ? `${role}Italic` : role, font, anchor },
    ...(line ? [{ kind: 'line' as const, x1: line.x1, y1: line.y, x2: line.x2, y2: line.y, role: 'underline' }] : []),
  ];
}

/** Box and name field: plain black and white, in the card look a card with a toned head. */
function frame(c: Classifier, art: ClassArt, cards: boolean): Shape[] {
  const body = c.emph ? 'boxEmph' : cards ? 'card' : 'box';
  if (!cards) return [{ kind: 'rect', ...art.rect, role: body }];
  const head = Math.min(art.head.h, art.rect.h);
  return [
    ...cardBody(art.rect, body),
    { kind: 'path', d: headPath(art.rect, head, CARD.radius), role: `tone-${c.tone ?? 'slate'}` },
  ];
}

/** A classifier after UML: name field with stereotype, name and `{abstract}`, below it the compartments. */
export function classShape(c: Classifier, rect: Rect, cards: boolean): Shape {
  const art = classArt(c, rect);
  const small = cards ? 'cardStereo' : 'stereo';
  const rule = cards ? 'cardRule' : 'divider';
  const children: Shape[] = [
    ...frame(c, art, cards),
    ...(art.stereotype ? text(art.stereotype, small, 'stereo', 'middle') : []),
    ...text(art.name, cards ? 'cardName' : 'name', 'name', 'middle'),
    ...(art.property ? text(art.property, small, 'stereo', 'middle') : []),
    ...art.dividers.map((y): Shape => ({ kind: 'line', x1: rect.x, y1: y, x2: rect.x + rect.w, y2: y, role: rule })),
    ...art.members.flatMap((m) => text(m, 'member', 'member', 'start')),
    ...(art.template
      ? [
          { kind: 'rect' as const, ...art.template.rect, role: 'template' },
          ...text(art.template.text, 'member', 'member', 'start'),
        ]
      : []),
  ];
  return { kind: 'group', id: domId.node(c.id), children };
}

/** The diamond of an n-ary association with its name at the top right; a symbol, so cards add only the shadow. */
export function diamondShape(a: NaryAssociation, r: Rect, cards: boolean): Shape {
  const [cx, cy] = [r.x + r.w / 2, r.y + r.h / 2];
  const d = `M${r.x} ${cy} L${cx} ${r.y} L${r.x + r.w} ${cy} L${cx} ${r.y + r.h} Z`;
  const at = { x: cx + CLASS.naryNameGap, y: r.y - CLASS.naryNameGap };
  return {
    kind: 'group',
    id: domId.node(a.id),
    children: [
      ...(cards ? [{ kind: 'path' as const, d, role: 'cardShadow', offset: [0, CARD.shadow] as const }] : []),
      { kind: 'path', d, role: a.emph ? 'boxEmph' : 'box' },
      ...(a.label
        ? [{ kind: 'text' as const, ...at, text: a.label, role: 'plainLabel', font: 'label', anchor: 'start' as const }]
        : []),
    ],
  };
}

/** A package: the tab with its name at the top left, below it the body; in the card look a toned area. */
export function packageShape(id: string, label: string, tone: Tone | undefined, r: Rect, cards: boolean): Shape {
  const tab = { x: r.x, y: r.y, w: Math.min(r.w, tabWidth(label)), h: CLASS.tabH };
  const body = { x: r.x, y: r.y + tab.h, w: r.w, h: r.h - tab.h };
  const t = tone ?? 'slate';
  const shapes: Shape[] = cards
    ? [
        { kind: 'path', d: tabbedFrame(body, CARD.radius), role: `tint-${t}` },
        { kind: 'path', d: headPath(tab, tab.h, CARD.radius, false), role: `tone-${t}` },
      ]
    : [
        { kind: 'rect', ...body, role: 'package' },
        { kind: 'rect', ...tab, role: 'package' },
      ];
  const name: Shape = {
    kind: 'text',
    x: tab.x + CLASS.tabPadX,
    y: tab.y + tab.h / 2 + 4,
    text: label,
    role: cards ? 'cardName' : 'name',
    font: 'name',
    anchor: 'start',
  };
  return { kind: 'group', id: domId.group(id), children: [...shapes, name] };
}
