import type { Placed, Rect } from '@diagrist/core';
import type { GuardText } from './guards.js';
import type { SideText } from './index.js';
import { SIZE, widthOf } from './metrics.js';
import type { PlacedNode } from './place.js';
import type { ActivityText, RegionArt } from './regions.js';

/** The rectangle a label covers: from its ascent down to below its baseline. */
function textRect(t: ActivityText): Rect {
  const w = widthOf.label(t.text);
  const x = t.anchor === 'start' ? t.x : t.anchor === 'end' ? t.x - w : t.x - w / 2;
  return { x, y: t.y - SIZE.label, w, h: SIZE.label + 3 };
}

const inside = (a: Rect, b: Rect) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;

/**
 * What the layout placed, for the kernel's check (ADR 0010). Nodes are boxes that belong into their region, frames
 * of regions are boxes, so a frame around a node that is not its member is an overlap (the predecessor's E439).
 * Texts beside nodes, guards and region names belong into the innermost frame around them. Lanes, lines, pins and
 * expansion nodes on a frame are left out: lines cross lanes and frames by design.
 */
export function placedOf(
  nodes: readonly PlacedNode[],
  regions: readonly RegionArt[],
  guards: readonly GuardText[],
  side: readonly SideText[],
): Placed[] {
  const frames = regions.map((r): Placed => ({ key: r.id, kind: 'box', rect: r.rect }));
  const home = (rect: Rect) => regions.filter((r) => inside(rect, r.rect)).at(-1)?.id;
  const boxes = nodes.flatMap((p): Placed[] => {
    if (p.node.port) return [];
    const within = regions.find((r) => r.members.includes(p.id))?.id;
    return [{ key: p.id, kind: 'box', rect: p.rect, ...(within ? { within } : {}), span: p.node.span }];
  });
  const text = (key: string, t: ActivityText): Placed => {
    const rect = textRect(t);
    const within = home(rect);
    return { key, kind: 'text', rect, ...(within ? { within } : {}) };
  };
  return [
    ...frames,
    ...boxes,
    ...guards.map((g) => text(`label-${g.route}`, g)),
    ...side.map((t) => text(t.key, t.text)),
  ];
}
