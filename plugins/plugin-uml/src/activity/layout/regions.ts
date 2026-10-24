import type { Rect } from '@diagrist/core';
import type { LayerEdge } from '@diagrist/layout-grid';
import type { ActivityNode } from '../diagram.js';
import type { Graph, GraphFlow } from './graph.js';
import { ACT, cx, union } from './metrics.js';

/** A text with its anchor, as the scene draws it. */
export interface ActivityText {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly anchor: 'start' | 'middle' | 'end';
}

/** An interruptible or expansion region in the picture: a dashed, rounded frame around its members. */
export interface RegionArt {
  readonly id: string;
  readonly rect: Rect;
  readonly rx: number;
  readonly members: readonly string[];
  /** Name of the region; `name` is where it stands, if there is room (`nameRegions`). */
  readonly label?: string;
  readonly name?: ActivityText;
  /** More lines of the name, when it stands apart from the keyword or wraps. */
  readonly more?: readonly ActivityText[];
  /** Expansion region: its mode as keyword, such as `«parallel»`, before the name. */
  readonly keyword?: string;
}

/** Box of a member with its side text and the pins that reach beyond its edge. */
export function memberBox(n: ActivityNode, r: Rect, e: { readonly left: number; readonly right: number }): Rect {
  const [left, right] = [Math.max(r.w / 2, e.left), Math.max(r.w / 2, e.right)];
  const up = n.inputs.length ? ACT.pin : 0;
  return { x: cx(r) - left, y: r.y - up, w: left + right, h: r.h + up + (n.outputs.length ? ACT.pin : 0) };
}

/** Layers in which a named region starts: above them its name needs a band inside the frame. */
export function regionBands(g: Graph, layerOf: ReadonlyMap<string, number>): Set<number> {
  return new Set(
    g.regions
      .filter((r) => r.label)
      .flatMap((r) => {
        const layers = g.nodes.filter((n) => n.interruptible === r.id).map((n) => layerOf.get(n.id) ?? 0);
        return layers.length ? [Math.min(...layers)] : [];
      }),
  );
}

/**
 * Triggers of a region (members without input, mostly `accept`) would stand on top, far from their region. They get
 * the predecessors of its deepest other member as ranked edges and so stand beside it; the interrupting edge then
 * leaves the region downwards.
 */
export function triggerEdges(g: Graph, flows: readonly GraphFlow[], layerOf: ReadonlyMap<string, number>): LayerEdge[] {
  const layer = (id: string) => layerOf.get(id) ?? 0;
  return g.regions.flatMap((region) => {
    const members = g.nodes.filter((n) => n.interruptible === region.id).map((n) => n.id);
    const triggers = members.filter((id) => !flows.some((f) => f.to === id));
    const core = members.filter((id) => !triggers.includes(id));
    const [head] = core;
    if (triggers.length === 0 || head === undefined) return [];
    const deepest = core.reduce((a, b) => (layer(b) >= layer(a) ? b : a), head);
    const preds = flows.filter((f) => f.to === deepest && layer(f.from) < layer(deepest)).map((f) => f.from);
    return triggers.flatMap((t) => preds.map((p): LayerEdge => ({ from: p, to: t, rank: 1 })));
  });
}

/**
 * A frame per interruptible region around its members with their side texts, at a distance; a named region has a
 * band for its name at the top. `extent` reaches from the centre of a node to its edge with side text.
 */
export function regionArt(
  g: Graph,
  rects: ReadonlyMap<string, Rect>,
  extent: (id: string) => { readonly left: number; readonly right: number },
): RegionArt[] {
  return g.regions.flatMap((region) => {
    const boxes = g.nodes.flatMap((n) => {
      const r = rects.get(n.id);
      return n.interruptible === region.id && r ? [{ id: n.id, box: memberBox(n, r, extent(n.id)) }] : [];
    });
    if (boxes.length === 0) return [];
    const u = union(boxes.map((b) => b.box));
    const pad = ACT.regionPad;
    const band = region.label ? ACT.regionLabelH : 0;
    return [
      {
        id: region.id,
        rect: { x: u.x - pad, y: u.y - pad - band, w: u.w + 2 * pad, h: u.h + 2 * pad + band },
        rx: ACT.regionRx,
        members: boxes.map((b) => b.id),
        ...(region.label ? { label: region.label } : {}),
      },
    ];
  });
}
