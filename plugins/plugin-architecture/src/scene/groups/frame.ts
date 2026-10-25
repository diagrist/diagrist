import type { Shape } from '@diagrist/core';
import type { PlacedFrame } from '../../layout/index.js';
import { cased, type Look } from '../../looks/look.js';
import type { Role } from '../../model/types.js';
import type { Texts } from '../../texts/index.js';

/** The role of a frame's outline by the responsibility of its group; a look paints each its way. */
export const FRAME_ROLE: Readonly<Record<Role, string>> = {
  own: 'frameOwn',
  shared: 'frameShared',
  external: 'frameExternal',
};

/** The outline of a frame: its tone, else the role of its responsibility. */
export const outlineRole = (f: PlacedFrame): string =>
  f.group.tone ? `tint-${f.group.tone}` : FRAME_ROLE[f.group.role ?? 'shared'];

/**
 * A frame of the form `frame`: a rounded outline, and the head as `groups.head` places it. At the corner title and
 * team are written, even empty, as the predecessor did; on the line only the title, larger, on a ground cut out of
 * the line.
 */
export function frameFormShapes(f: PlacedFrame, look: Look, texts: Texts): Shape[] {
  const { group: g, head } = f;
  const outline: Shape = { kind: 'rect', ...f.rect, rx: look.metrics.frameRx, role: outlineRole(f) };
  if (look.options.groups.head === 'onLine')
    return [
      outline,
      ...(head.titleBox ? [{ kind: 'rect', ...head.titleBox, role: 'knockout' } as const] : []),
      { kind: 'text', ...head.title, text: g.title, role: 'frameTitleOnLine', font: 'large' },
    ];
  const team = g.team ?? (g.role ? texts.roles[g.role] : '');
  return [
    outline,
    { kind: 'text', ...head.title, text: cased(g.title, look.fonts.group), role: 'frameTitle', font: 'group' },
    { kind: 'text', ...head.subtitle, text: team, role: 'frameTeam', font: 'note' },
  ];
}
