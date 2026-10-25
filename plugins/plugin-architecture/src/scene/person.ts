import type { Shape } from '@diagrist/core';
import type { PersonArt } from '../layout/art.js';
import { secondLineRole } from '../layout/measure.js';
import type { LookOptions } from '../looks/look.js';
import type { ArchNode } from '../model/types.js';

/** Head radius, and from the top of the bust the head's centre, the shoulders' width, their crown and their base. */
const BUST = { head: 10, headY: 13, shoulder: 21, top: 32, base: 53 } as const;

/** A person as a stick figure: head, body, arms, legs, name and role below. */
function figureShapes(n: ArchNode, art: PersonArt): Shape[] {
  return [
    { kind: 'circle', ...art.head, role: 'head' },
    { kind: 'line', ...art.body, role: 'limb' },
    { kind: 'line', ...art.arms, role: 'limb' },
    ...art.legs.map((leg): Shape => ({ kind: 'line', ...leg, role: 'limb' })),
    { kind: 'text', ...art.label, text: n.label, role: 'name', font: 'name', anchor: 'middle' },
    ...(n.tech
      ? [{ kind: 'text', ...art.tech, text: n.tech, role: 'tech', font: 'note', anchor: 'middle' } as const]
      : []),
  ];
}

/** A person as a bust: head and shoulders, name and role below. */
function bustShapes(n: ArchNode, art: PersonArt): Shape[] {
  const { cx } = art.head;
  const top = art.head.cy - BUST.headY;
  const { shoulder: s, base } = BUST;
  const d = `M${cx - s} ${top + base} C${cx - s} ${top + BUST.top} ${cx + s} ${top + BUST.top} ${cx + s} ${top + base} Z`;
  const role = secondLineRole(n);
  return [
    { kind: 'path', d, role: 'limb' },
    { kind: 'circle', cx, cy: top + BUST.headY, r: BUST.head, role: 'head' },
    { kind: 'text', ...art.label, text: n.label, role: 'name', font: 'name', anchor: 'middle' },
    ...(n.tech ? [{ kind: 'text', ...art.tech, text: n.tech, role, font: role, anchor: 'middle' } as const] : []),
  ];
}

/** How each value of `person` draws a person. */
export const PEOPLE: Readonly<Record<LookOptions['person'], (n: ArchNode, art: PersonArt) => Shape[]>> = {
  figure: figureShapes,
  bust: bustShapes,
};
