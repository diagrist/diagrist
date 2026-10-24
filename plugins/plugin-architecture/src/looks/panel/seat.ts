import type { EdgeLabel, Route } from '@diagrist/layout-grid';
import type { Badge } from '../../layout/marks.js';
import { seatBadges } from '../../layout/paper-marks.js';

/** How far a pill reaches beyond the texts it holds, across and along its line. */
export const PILL = { x: 8, y: 4 } as const;

const grown = (l: EdgeLabel, by: number): EdgeLabel => ({
  ...l,
  box: {
    x: l.box.x - by * PILL.x,
    y: l.box.y - by * PILL.y,
    w: l.box.w + 2 * by * PILL.x,
    h: l.box.h + 2 * by * PILL.y,
  },
});

/**
 * Flow numbers seated as on paper, but clear of the pill around the texts rather than of the texts alone: the boxes
 * grow by the pill while the numbers find their spot, and shrink back with whatever move they were given.
 */
export function seatPanelBadges(
  badges: readonly Badge[],
  labels: readonly EdgeLabel[],
  routes: readonly Route[],
): { badges: Badge[]; labels: EdgeLabel[] } {
  const seated = seatBadges(
    badges,
    labels.map((l) => grown(l, 1)),
    routes,
  );
  return { badges: seated.badges, labels: seated.labels.map((l) => grown(l, -1)) };
}
