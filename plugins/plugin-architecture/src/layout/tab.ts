import { type Font, type Rect, textWidth } from '@diagrist/core';
import type { Stretch } from '@diagrist/layout-grid';
import type { Look } from '../looks/look.js';
import type { ArchNode } from '../model/types.js';
import type { Spot } from './art.js';

/**
 * The tab of `nodeName: tab`: how far the gap in the top edge starts from the left corner, the room beside the name
 * within it, how far the baseline sits below the edge, and half the height of the gap.
 */
const TAB = { inset: 14, pad: 6, rise: 4, cut: 2 } as const;
/** Room for the status dot after the name, with `status: dot`. */
const DOT_ROOM = 14;
/** Inside a box below its tab: the top kept free, and the gap between icon and second line. */
const INSIDE = { top: 8, gap: 10 } as const;
/** The height of capitals in a font, as a share of its size, to centre a line by what is seen of it. */
const CAP = 0.75;

/** Icons a box with a tab takes from its shape or keyword, since its body is square. */
const SHAPE_ICON = { db: 'database', queue: 'layers', store: 'archive', job: 'cpu', app: 'monitor' } as const;

/** Where a box with a tab draws its parts: the gap cut into the top edge, name, icon and second line. */
export interface TabArt {
  /** The gap in the top edge behind the name; none when the name stands in the middle of the box. */
  readonly gap?: Rect;
  readonly icon?: string;
}

/** The icon inside a box with a tab: its own, else that of its shape, a person's figure for people. */
export const tabIcon = (n: ArchNode): string | undefined =>
  n.icon ?? (n.shape ? SHAPE_ICON[n.shape] : n.keyword === 'person' ? 'user-round' : undefined);

/** The name a box writes into its top edge, with the number of its replicas. */
export const tabName = (n: ArchNode): string => (n.replicas !== undefined ? `${n.label} ×${n.replicas}` : n.label);

/** A box writes its name into the top edge when it has one and something else to show inside. */
const hasTab = (n: ArchNode): boolean => n.label !== '' && (n.tech !== undefined || tabIcon(n) !== undefined);

/** The stretch of the top edge the name takes, from the left corner, with its room and the status dot. */
export function tabStretch(n: ArchNode, look: Look): Stretch | undefined {
  if (look.options.nodeName !== 'tab' || !hasTab(n)) return undefined;
  const dot = look.options.status === 'dot' && n.status ? DOT_ROOM : 0;
  return { from: TAB.inset, to: TAB.inset + textWidth(tabName(n), look.fonts.name) + dot + 2 * TAB.pad };
}

/** The width a box with a tab needs: the tab with room to dock right of it, and its second line inside. */
export function tabWidth(n: ArchNode, look: Look, tech: number): number {
  const m = look.metrics;
  const tab = tabStretch(n, look);
  return Math.max(tab ? tab.to + 2 * m.laneGap + m.nodePad : 0, tech + 2 * m.nodePad);
}

/**
 * The parts of a box with `nodeName: tab`: the name in a gap of the top edge, icon and second line centred one above
 * the other below it, the second line measured in `second`. A box without a tab writes its name, else its second
 * line, in the middle.
 */
export function tabParts(
  n: ArchNode,
  rect: Rect,
  look: Look,
  second: Font,
): { tab: TabArt; label: Spot; tech: Spot; icon: Spot } {
  const m = look.metrics;
  const cx = rect.x + rect.w / 2;
  const icon = tabIcon(n);
  const stretch = tabStretch(n, look);
  if (!stretch) {
    const middle = { x: cx, y: rect.y + rect.h / 2 + m.labelDy };
    return { tab: {}, label: middle, tech: middle, icon: middle };
  }
  const cap = n.tech !== undefined ? second.size * CAP : 0;
  const block = (icon ? m.iconSize : 0) + (icon && cap ? INSIDE.gap : 0) + cap;
  const top = rect.y + INSIDE.top + (rect.h - INSIDE.top - block) / 2;
  const gap = { x: rect.x + stretch.from, y: rect.y - TAB.cut, w: stretch.to - stretch.from, h: 2 * TAB.cut };
  return {
    tab: { gap, ...(icon ? { icon } : {}) },
    label: { x: gap.x + TAB.pad, y: rect.y + TAB.rise },
    tech: { x: cx, y: top + block },
    icon: { x: cx - m.iconSize / 2, y: top },
  };
}
