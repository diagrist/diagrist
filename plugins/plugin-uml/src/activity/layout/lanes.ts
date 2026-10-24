import type { Rect } from '@diagrist/core';
import type { Graph } from './graph.js';
import { ACT, SIZE, widthOf } from './metrics.js';

/** A lane (partition) with its head; without partitions there is one invisible lane. */
export interface LaneArt {
  readonly id: string;
  readonly label: string;
  readonly rect: Rect;
  readonly head: Rect;
  readonly text: { readonly x: number; readonly y: number };
}

/** Vertical frame: top of the lanes and first row. */
export interface LaneFrame {
  readonly visible: boolean;
  readonly top: number;
  readonly firstRow: number;
}

/** Without partitions the first row begins where the lane head would stand. */
export function laneFrame(g: Graph): LaneFrame {
  const top = ACT.firstRowY - 48;
  if (g.partitions.length === 0) return { visible: false, top, firstRow: top + ACT.lanePadY };
  return { visible: true, top, firstRow: top + ACT.laneHeadH + ACT.lanePadY };
}

/** Least width of a lane: content with margins, the name in the head, the least lane width. */
export function laneMinWidth(g: Graph, lane: number, content: number): number {
  if (g.partitions.length === 0) return content;
  const label = g.partitions[lane]?.label ?? '';
  const head = widthOf.node(label, true) + 2 * ACT.lanePadX;
  return Math.ceil(Math.max(ACT.laneMinW, content + 2 * ACT.lanePadX, head) / 8) * 8;
}

/** Lanes side by side, all as tall, with a head and the name centred in it. */
export function laneArt(
  g: Graph,
  xs: readonly number[],
  widths: readonly number[],
  frame: LaneFrame,
  bottom: number,
): LaneArt[] {
  if (!frame.visible) return [];
  return g.partitions.map((p, i) => {
    const x = xs[i] ?? 0;
    const w = widths[i] ?? 0;
    return {
      id: p.id,
      label: p.label,
      rect: { x, y: frame.top, w, h: bottom - frame.top },
      head: { x, y: frame.top, w, h: ACT.laneHeadH },
      text: { x: x + w / 2, y: frame.top + ACT.laneHeadH / 2 + SIZE.node / 3 },
    };
  });
}
