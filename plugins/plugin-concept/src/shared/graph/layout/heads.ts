import { type Placed, type Rect, textWidth } from '@diagrist/core';
import type { GridLayout } from '@diagrist/layout-grid';
import type { ColumnHead, ColumnVerb } from './edges.js';
import { GRAPH_FONTS as F, ITEM } from './metrics.js';

/** A text of the head row: where it starts or is centred, its baseline, and the box it covers. */
export interface PlacedHead {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly anchor: 'start' | 'middle';
  readonly rect: Rect;
}

/** How far above the first row of items the head row stands. */
const ROW = { baseline: 16, top: 27, h: 14 } as const;

/**
 * The head row of a picture in columns: each head where the texts of its column start, the first column's at its
 * edge, since it leads with bare text; and between two heads, quieter, the verb all their lines share.
 */
export function placeHeads(
  fitted: GridLayout,
  heads: readonly ColumnHead[],
  verbs: readonly ColumnVerb[],
): { readonly heads: PlacedHead[]; readonly verbs: PlacedHead[]; readonly placed: Placed[] } {
  const top = fitted.rows[0]?.y ?? 0;
  const at = (text: string, x: number, anchor: 'start' | 'middle', font: typeof F.head): PlacedHead => {
    const w = textWidth(text, font);
    const left = anchor === 'middle' ? x - w / 2 : x;
    return { text, x, y: top - ROW.baseline, anchor, rect: { x: left, y: top - ROW.top, w, h: ROW.h } };
  };
  const col = (name: string) => fitted.cols.find((c) => c.name === name);
  const placedHeads = heads.flatMap((h, k): PlacedHead[] => {
    const c = col(h.col);
    return c ? [at(h.text, c.x + (k === 0 ? 0 : ITEM.padX), 'start', F.head)] : [];
  });
  const placedVerbs = verbs.flatMap((v): PlacedHead[] => {
    const [a, b] = [col(v.left), col(v.right)];
    return a && b ? [at(v.text, (a.x + a.w + b.x) / 2, 'middle', F.label)] : [];
  });
  return {
    heads: placedHeads,
    verbs: placedVerbs,
    placed: [...placedHeads, ...placedVerbs].map((h, i): Placed => ({ key: `head-${i}`, kind: 'text', rect: h.rect })),
  };
}
