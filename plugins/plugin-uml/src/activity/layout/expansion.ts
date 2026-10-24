import type { Rect } from '@diagrist/core';
import type { LayerEdge } from '@diagrist/layout-grid';
import type { ActivityNode, ExpansionPort } from '../diagram.js';
import type { Graph, GraphFlow } from './graph.js';
import { ACT, cx, cy, SIZE, union, widthOf } from './metrics.js';
import { type ActivityText, memberBox, type RegionArt } from './regions.js';

/** Gap of the keyword to the frame and to the edge from the input inside (as in `nameRegions`). */
const INSET = 8;

/** Boxes of an expansion node, as in the figures of UML 2.5.1 (16.12.4). */
export const EXPANSION_SLOTS = 4;

/** Keyword of the mode at the top left of the frame (UML 2.5.1, 16.12.4). */
const modeKeyword = (mode: string): string => `«${mode}»`;

type Port = ActivityNode & { readonly port: ExpansionPort };

const ports = (g: Graph): Port[] => g.nodes.filter((n): n is Port => n.port !== undefined);

/** Members of an expansion region, without its expansion nodes. */
const membersOf = (g: Graph, region: string): ActivityNode[] =>
  g.nodes.filter((n) => n.expansion === region && n.port === undefined);

/** Ranked edges: the input stands above all members, the output below them. */
export function expansionEdges(g: Graph): LayerEdge[] {
  return ports(g).flatMap((x) =>
    membersOf(g, x.port.region).map(
      (m): LayerEdge => (x.port.side === 'in' ? { from: x.id, to: m.id, rank: 1 } : { from: m.id, to: x.id, rank: 1 }),
    ),
  );
}

/**
 * Several inputs of a region stand in one layer on its top edge, several outputs on its bottom edge: for the
 * layering they count as one node (pairs with the first, without an edge of their own).
 */
export function expansionTies(g: Graph): GraphFlow[] {
  const all = ports(g);
  return all.flatMap((n): GraphFlow[] => {
    const first = all.find((p) => p.port.region === n.port.region && p.port.side === n.port.side);
    if (!first || first === n) return [];
    return [{ from: first.id, to: n.id, kind: 'object', interrupt: false, else: false, span: n.span, index: -1 }];
  });
}

/** Half the least width of the frame: left of the input the keyword fits, clear of the edge inside. */
const expansionHalf = (mode: string): number => widthOf.label(modeKeyword(mode)) + 2 * INSET + ACT.sideGap;

/** Width of the name of an expansion node with its gap to the node; 0 without a name. */
const nameWidth = (p: ExpansionPort): number => (p.name ? ACT.pinGap + widthOf.label(p.name) : 0);

/** Size of an expansion node for the placement, as `activitySize` gives it for other nodes. */
export function expansionSize(p: ExpansionPort) {
  const w = EXPANSION_SLOTS * ACT.expansionSlot;
  const named = w / 2 + nameWidth(p) + (p.name ? ACT.sideGap : 0);
  if (p.index === 0) {
    const half = expansionHalf(p.mode);
    const right = Math.max(half, named);
    return { w, h: ACT.expansionSlot, span: 2 * right, left: half, right };
  }
  const [left, right] = [w / 2 + ACT.sideGap, Math.max(w / 2 + ACT.sideGap, named)];
  return { w, h: ACT.expansionSlot, span: 2 * Math.max(left, right), left, right };
}

/**
 * Name of an expansion node right of it: at an input above the top edge of the frame, at an output below the bottom
 * edge, so outside the region like the type at a pin.
 */
export function expansionText(p: ExpansionPort, rect: Rect): ActivityText | undefined {
  if (!p.name) return undefined;
  const y = p.side === 'in' ? cy(rect) - 3 : cy(rect) + SIZE.label + 1;
  return { text: p.name, x: rect.x + rect.w + ACT.pinGap, y, anchor: 'start' };
}

/**
 * A frame per expansion region around its members with pins and side texts, the top edge through the middle of the
 * inputs, the bottom edge through the middle of the outputs; without an output it ends at a distance below the
 * members. `nameRegions` puts the keyword below the left input, so the frame reaches `expansionHalf` left of it.
 */
export function expansionArt(
  g: Graph,
  rects: ReadonlyMap<string, Rect>,
  extent: (id: string) => { readonly left: number; readonly right: number },
): RegionArt[] {
  return g.expansions.flatMap((x) => {
    const own = ports(g).filter((n) => n.port.region === x.id && rects.has(n.id));
    const side = (s: 'in' | 'out') => own.flatMap((n) => (n.port.side === s ? [rects.get(n.id) as Rect] : []));
    const [ins, outs] = [side('in'), side('out')];
    const a = [...ins].sort((p, q) => p.x - q.x)[0];
    if (!a) return [];
    const members = membersOf(g, x.id).filter((n) => rects.has(n.id));
    const boxes = members.map((n) => memberBox(n, rects.get(n.id) as Rect, extent(n.id)));
    const pad = ACT.regionPad;
    const half = expansionHalf(x.mode);
    const keyword = { x: cx(a) - half + pad, y: a.y, w: 2 * half - 2 * pad, h: a.h };
    const u = union([...boxes, keyword, ...ins, ...outs]);
    const top = cy(a);
    const [out] = outs;
    const end = out ? cy(out) : u.y + u.h + pad;
    return [
      {
        id: x.id,
        rect: { x: u.x - pad, y: top, w: u.w + 2 * pad, h: end - top },
        rx: ACT.regionRx,
        members: [...members.map((n) => n.id), ...own.map((n) => n.id)],
        keyword: modeKeyword(x.mode),
        ...(x.label ? { label: x.label } : {}),
      },
    ];
  });
}
