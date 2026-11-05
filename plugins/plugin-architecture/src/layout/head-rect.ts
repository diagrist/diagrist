import { textWidth } from '@diagrist/core';
import type { GridGroup } from '@diagrist/layout-grid';
import { cased, type Look } from '../looks/look.js';
import type { ArchGroup } from '../model/types.js';

/** How far a title on the frame line starts from the left corner, and the room cut out beside it. */
export const TITLE_INSET = 24;
export const TITLE_PAD = 8;
/** How far a centred title sits below the baseline the corner title takes. */
export const BLOCK_DY = 4;

/** How far a head reaches below the baseline of its last line. */
const DESCENT = 4;

/**
 * The rectangle the head of a frame takes, from the frame's top left corner or the middle of its top edge, for the
 * routes of a fixed grid to keep out of: title and team at the corner, the title centred or on the line. A side
 * heading stands in the middle of the frame's height, which the grid does not know yet; it gives none.
 */
export function headRect(g: ArchGroup, look: Look, team: string): GridGroup['head'] {
  const { metrics: m, fonts } = look;
  const head = look.options.groups.head;
  if (g.heading === 'side' || (g.title === '' && (team === '' || head !== 'corner'))) return undefined;
  if (head === 'onLine') {
    const size = fonts.heading.size;
    return { x: TITLE_INSET, y: -size / 2 - 2, w: textWidth(g.title, fonts.heading) + 2 * TITLE_PAD, h: size + 4 };
  }
  if (head === 'centre') {
    const w = textWidth(g.title, fonts.heading);
    const top = m.groupTitleY + BLOCK_DY - fonts.heading.size;
    return { x: -w / 2, y: top, w, h: fonts.heading.size + DESCENT, origin: 'middle' };
  }
  const title = textWidth(cased(g.title, fonts.group), fonts.group);
  const top = m.groupTitleY - fonts.group.size;
  const lower = team === '' ? m.groupTitleY : m.groupSubtitleY;
  return { x: m.groupTextX, y: top, w: Math.max(title, textWidth(team, fonts.note)), h: lower + DESCENT - top };
}
