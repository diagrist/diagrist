import type { Rect, Shape } from '@diagrist/core';

/** Offset of the soft shadow below cards, and the corner radius of cards. */
export const CARD = { shadow: 3, radius: 8 } as const;

/** A card with its soft shadow; `body` picks the role of the card itself, such as the highlight. */
export const cardBody = (r: Rect, body: string, rx: number = CARD.radius): Shape[] => [
  { kind: 'rect', ...r, y: r.y + CARD.shadow, ...(rx ? { rx } : {}), role: 'cardShadow' },
  { kind: 'rect', ...r, ...(rx ? { rx } : {}), role: body },
];

/** A head with rounded top corners and a straight bottom; reaching over the whole card, a round card. */
export function headPath(r: Rect, h: number, rx: number, round = h >= r.h): string {
  const [x, y, w] = [r.x, r.y, r.w];
  const b = y + h;
  const low = round
    ? `L${x + w} ${b - rx} Q${x + w} ${b} ${x + w - rx} ${b} L${x + rx} ${b} Q${x} ${b} ${x} ${b - rx}`
    : `L${x + w} ${b} L${x} ${b}`;
  return `M${x} ${y + rx} Q${x} ${y} ${x + rx} ${y} L${x + w - rx} ${y} Q${x + w} ${y} ${x + w} ${y + rx} ${low} Z`;
}

/** A frame with a sharp top left corner, where a tab sits, and the other corners rounded. */
export function tabbedFrame(r: Rect, rx: number): string {
  const [x, y, w, h] = [r.x, r.y, r.w, r.h];
  const [rt, b] = [x + w, y + h];
  return `M${x} ${y} L${rt - rx} ${y} Q${rt} ${y} ${rt} ${y + rx} L${rt} ${b - rx} Q${rt} ${b} ${rt - rx} ${b} L${x + rx} ${b} Q${x} ${b} ${x} ${b - rx} Z`;
}
