import type { Rect } from '@diagrist/core';
import { bottom, right, union } from '../geometry.js';
import type { Column, PlacedGroup, PlacedNode } from '../layout.js';
import type { GridGroup, GridNode } from '../spec.js';
import { depth, groupExtent, type Tree } from './extent.js';

/** What a node covers in the picture: its rectangle and the caption hanging below it. */
export function memberBounds(p: PlacedNode, n: GridNode | undefined): Rect {
  const caption = n?.caption;
  if (!caption) return p.rect;
  const lines = bottom(p.rect) + caption.below;
  const x = p.rect.x + p.rect.w / 2;
  return union([p.rect, { x: x - caption.w / 2, y: p.rect.y, w: caption.w, h: lines - p.rect.y }]);
}

/**
 * Frames as hulls of their members and child frames plus their pads, the deepest first. In an adaptive grid frames
 * of one depth with the same top get the same height, and those over the same columns line up left and right, like
 * layer bands. The result lists parents first, the order to draw them in.
 */
export function placeGroups(tree: Tree, nodes: readonly PlacedNode[], cols: readonly Column[]): PlacedGroup[] {
  const groups = tree.spec.groups;
  const byId = new Map(nodes.map((p) => [p.id, p]));
  const rects = new Map<string, Rect>();
  const depths = [...new Set(groups.map((g) => depth(tree, g)))].sort((a, b) => b - a);
  for (const d of depths) {
    const level = groups.filter((g) => depth(tree, g) === d);
    for (const g of level) {
      const members = g.members.flatMap((id) => {
        const p = byId.get(id);
        return p ? [memberBounds(p, tree.node(id))] : [];
      });
      const children = groups.filter((c) => c.parent === g.id).flatMap((c) => rects.get(c.id) ?? []);
      const hull = [...members, ...children];
      if (hull.length === 0) continue;
      const u = covering(union(hull), g, cols);
      const pad = g.pads;
      rects.set(g.id, {
        x: u.x - pad.left,
        y: u.y - pad.top,
        w: Math.max(u.w + pad.left + pad.right, g.minWidth ?? 0),
        h: u.h + pad.top + pad.bottom,
      });
    }
    if (tree.spec.adaptive) {
      equalize(level, rects);
      align(level, rects, tree);
    }
  }
  const order = [...groups].sort((a, b) => depth(tree, a) - depth(tree, b));
  return order.flatMap((g) => {
    const rect = rects.get(g.id);
    return rect ? [{ id: g.id, rect }] : [];
  });
}

function covering(u: Rect, g: GridGroup, cols: readonly Column[]): Rect {
  const col = g.cover ? cols.find((c) => c.name === g.cover) : undefined;
  if (!col) return u;
  const x = Math.min(u.x, col.x);
  return { ...u, x, w: Math.max(right(u), col.x + col.w) - x };
}

function equalize(level: readonly GridGroup[], rects: Map<string, Rect>): void {
  const rows = new Map<string, Rect[]>();
  for (const g of level) {
    const r = rects.get(g.id);
    if (!r) continue;
    const key = String(r.y);
    rows.set(key, [...(rows.get(key) ?? []), r]);
  }
  for (const g of level) {
    const r = rects.get(g.id);
    if (!r) continue;
    const peers = rows.get(String(r.y)) ?? [r];
    rects.set(g.id, { ...r, h: Math.max(...peers.map(bottom)) - r.y });
  }
}

function align(level: readonly GridGroup[], rects: Map<string, Rect>, tree: Tree): void {
  const key = (g: GridGroup) => groupExtent(tree, g)?.cols.join(':');
  for (const g of level) {
    const r = rects.get(g.id);
    if (!r) continue;
    const peers = level.filter((p) => key(p) === key(g)).flatMap((p) => rects.get(p.id) ?? []);
    const x = Math.min(...peers.map((p) => p.x));
    rects.set(g.id, { ...r, x, w: Math.max(...peers.map(right)) - x });
  }
}
