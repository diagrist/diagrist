import type { Rect } from '@diagrist/core';
import { bottom, right } from '../geometry.js';
import type { LayeredLayout } from '../layered/output.js';
import type { PlacedGroup } from '../layout.js';
import type { LayoutGraph } from './spec.js';

/** Do the ranges `[a0, a1]` and `[b0, b1]` share more than an end? */
const meet = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1;

/**
 * The parts of one parent stretched until together they fill it below its head: side by side when no two share a
 * column, each reaching from the top of the highest to the parent's bottom and meeting its neighbours in the middle
 * of the gap between them, the outer ones reaching the parent's sides; stacked the other way round when no two share
 * a row. Parts that do neither stay as laid out.
 */
function stretched(parent: Rect, parts: readonly PlacedGroup[]): PlacedGroup[] {
  const across = parts.every((a, i) =>
    parts.every((b, j) => j <= i || !meet(a.rect.x, right(a.rect), b.rect.x, right(b.rect))),
  );
  const stacked = parts.every((a, i) =>
    parts.every((b, j) => j <= i || !meet(a.rect.y, bottom(a.rect), b.rect.y, bottom(b.rect))),
  );
  if (!across && !stacked) return [...parts];
  const sorted = [...parts].sort((a, b) => (across ? a.rect.x - b.rect.x : a.rect.y - b.rect.y));
  const lo = (r: Rect) => (across ? r.x : r.y);
  const hi = (r: Rect) => (across ? right(r) : bottom(r));
  const cuts = sorted.slice(1).map((b, i) => Math.round((hi((sorted[i] as PlacedGroup).rect) + lo(b.rect)) / 2));
  const start = Math.min(...parts.map((p) => (across ? p.rect.y : p.rect.x)));
  return sorted.map((p, i) => {
    const a = i === 0 ? lo(parent) : (cuts[i - 1] as number);
    const b = i === sorted.length - 1 ? hi(parent) : (cuts[i] as number);
    const rect = across
      ? { x: a, y: start, w: b - a, h: bottom(parent) - start }
      : { x: start, y: a, w: right(parent) - start, h: b - a };
    return { id: p.id, rect };
  });
}

/**
 * The parts (`GraphContainer.kind` `part`) stretched to fill their parent (layout plan P8): laid out as frames, the parts of one
 * parent then share its inside without gaps, so the kind draws a line where two meet. Pictures without parts are
 * handed back as they are.
 */
export function fillParts(graph: LayoutGraph, layout: LayeredLayout): LayeredLayout {
  const parts = (graph.containers ?? []).filter((c) => c.kind === 'part' && c.parent !== undefined);
  if (parts.length === 0 || layout.frames === undefined) return layout;
  const placed = new Map(layout.frames.map((f) => [f.id, f]));
  const out = new Map(placed);
  for (const parent of new Set(parts.map((p) => p.parent as string))) {
    const box = placed.get(parent);
    const own = parts.flatMap((p) => (p.parent === parent ? (placed.get(p.id) ?? []) : []));
    if (box === undefined || own.length === 0) continue;
    for (const p of stretched(box.rect, own)) out.set(p.id, p);
  }
  return { ...layout, frames: layout.frames.map((f) => out.get(f.id) ?? f) };
}
