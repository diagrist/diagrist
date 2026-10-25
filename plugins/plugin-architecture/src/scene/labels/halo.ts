import type { Shape } from '@diagrist/core';
import type { EdgeLabel } from '@diagrist/layout-grid';
import { type Surface, surfacesAt } from '../surfaces.js';

/**
 * A label with a halo in the colour of its ground (`edgeText.ground: halo`): the canvas halo cuts the lines below,
 * on a toned frame a ring in its tone follows, and the text itself last without halo. Detail lines have roles of
 * their own, which the standard look paints like the name.
 */
export function haloShapes(l: EdgeLabel, accent: boolean, under: readonly Surface[]): Shape[] {
  const at = { x: l.x, y: l.y, text: l.text, font: 'label', anchor: l.anchor } as const;
  const tints = surfacesAt(under, l.box.x + l.box.w / 2, l.box.y + l.box.h / 2).map((s) => s.tone);
  const text = (role: string): Shape => ({ kind: 'text', ...at, role });
  const part = l.part === 'detail' ? 'Detail' : 'Label';
  const base = text(`edge${part}${accent ? 'Accent' : ''}`);
  if (tints.length === 0) return [base];
  const ring = accent ? 'label-accent-halo' : 'label-halo';
  return [base, ...tints.map((t) => text(`${ring}-${t}`)), text(`edge${part}Bare${accent ? 'Accent' : ''}`)];
}
