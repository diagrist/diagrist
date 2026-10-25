import type { Shape } from '@diagrist/core';
import type { PlacedFrame } from '../../layout/index.js';
import { cased, type Look } from '../../looks/look.js';
import type { Texts } from '../../texts/index.js';
import { outlineRole } from './frame.js';

/**
 * A frame of the form `area`: a zone with square corners, which the look paints as an area for the own system and
 * a fine outline else; title in the group font and team below, each only when given.
 */
export function areaShapes(f: PlacedFrame, look: Look, texts: Texts): Shape[] {
  const { group: g, head } = f;
  const team = g.team ?? (g.role ? texts.roles[g.role] : '');
  const title = cased(g.title, look.fonts.group);
  return [
    { kind: 'rect', ...f.rect, role: outlineRole(f) },
    ...(title ? [{ kind: 'text', ...head.title, text: title, role: 'frameTitle', font: 'group' } as const] : []),
    ...(team ? [{ kind: 'text', ...head.subtitle, text: team, role: 'frameTeam', font: 'note' } as const] : []),
  ];
}
