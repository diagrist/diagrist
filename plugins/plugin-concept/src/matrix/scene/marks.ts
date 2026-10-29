import type { Shape } from '@diagrist/core';
import type { Mark } from '../scales.js';

/** Radius of a disc in a cell and in the legend. */
const R = 6;

/** The left half of a disc, filled, for `half`. */
const halfDisc = (cx: number, cy: number): string => ['M', cx, cy - R, 'A', R, R, 0, 0, 0, cx, cy + R, 'Z'].join(' ');

/**
 * The shapes of values centred on a point: ids of letter values as one bold text such as `R/A`, a full disc, or a
 * ring with its left half filled. The marks are shapes, not glyphs, so they look the same in every typeface and
 * survive greyscale.
 */
export function valueShapes(
  values: readonly { readonly id: string; readonly mark: Mark }[],
  cx: number,
  cy: number,
): Shape[] {
  const letters = values.filter((v) => v.mark === 'letter').map((v) => v.id);
  const discs = values.filter((v) => v.mark !== 'letter');
  return [
    ...(letters.length > 0
      ? [
          {
            kind: 'text',
            x: cx,
            y: cy + 4.2,
            text: letters.join('/'),
            role: 'cell',
            font: 'cell',
            anchor: 'middle',
          } as const,
        ]
      : []),
    ...discs.flatMap((v): Shape[] =>
      v.mark === 'full'
        ? [{ kind: 'circle', cx, cy, r: R, role: 'markFull' }]
        : [
            { kind: 'circle', cx, cy, r: R, role: 'markRing' },
            { kind: 'path', d: halfDisc(cx, cy), role: 'markFull' },
          ],
    ),
  ];
}

/** A note's number in a small dark disc. */
export function badgeShapes(x: number, y: number, n: number): Shape[] {
  return [
    { kind: 'circle', cx: x, cy: y, r: 7, role: 'badge' },
    { kind: 'text', x, y: y + 3.5, text: String(n), role: 'badgeText', font: 'badge', anchor: 'middle' },
  ];
}
