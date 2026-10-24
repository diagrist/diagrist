import type { Shape } from '@diagrist/core';

/** Margin of title, decision bar, legend and picture to the edge of the sheet. */
export const MARGIN = 32;

/** A text anchor on the sheet. */
export interface Spot {
  readonly x: number;
  readonly y: number;
}

/** Anchors of title and subtitle at the top edge. */
export interface Header {
  readonly title: Spot;
  readonly subtitle: Spot;
}

const TITLE_Y = 36;
const SUBTITLE_Y = 52;

/** Where every picture writes its title line and the subtitle below it. */
export const HEADER: Header = { title: { x: MARGIN, y: TITLE_Y }, subtitle: { x: MARGIN, y: SUBTITLE_Y } };

/**
 * The title line, such as `<name of the kind> · <title>` from `imageTitle`, and the subtitle when the header
 * has one. Roles `title` and `subtitle` are styled by `PART_ROLES`.
 */
export function headerShapes(header: Header, title: string, subtitle: string | undefined): Shape[] {
  const out: Shape[] = [{ kind: 'text', ...header.title, text: title, role: 'title', font: 'title' }];
  if (subtitle) out.push({ kind: 'text', ...header.subtitle, text: subtitle, role: 'subtitle', font: 'note' });
  return out;
}
