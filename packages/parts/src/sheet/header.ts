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

/** What the kicker header writes: the kicker above, then title and subtitle; an empty or missing text is left out. */
export interface KickerTexts {
  /** The name of the kind, already in the case its font sets it, such as capitals. */
  readonly kicker?: string | undefined;
  readonly title: string;
  readonly subtitle?: string | undefined;
}

/** Baselines of kicker, title and subtitle in the kicker header, all at the left margin. */
const KICKER = { kicker: 30, title: 50, subtitle: 67 } as const;

/**
 * The second form of the header: the kicker in the `group` font above the title instead of before it, the title
 * in the `title` font, the subtitle in the `note` font, each a line lower than in `HEADER`. Roles `kicker`, `title`
 * and `subtitle` are styled by `PART_ROLES`.
 */
export function kickerShapes(texts: KickerTexts): Shape[] {
  const { kicker, title, subtitle } = KICKER;
  return [
    ...(texts.kicker
      ? [{ kind: 'text', x: MARGIN, y: kicker, text: texts.kicker, role: 'kicker', font: 'group' } as const]
      : []),
    { kind: 'text', x: MARGIN, y: title, text: texts.title, role: 'title', font: 'title' },
    ...(texts.subtitle
      ? [{ kind: 'text', x: MARGIN, y: subtitle, text: texts.subtitle, role: 'subtitle', font: 'note' } as const]
      : []),
  ];
}
