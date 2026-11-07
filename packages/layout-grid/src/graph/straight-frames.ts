import type { Rect } from '@diagrist/core';
import type { PlacedGroup } from '../layout.js';
import type { LayoutGraph } from './spec.js';

/**
 * The frames of a graph whose layers run right, drawn with straight lines, back at their own pad at the right and the
 * bottom and at their top room above: the stages keep the room of a head on every side of a turned frame
 * (`turnGraph`), which a frame without lines along its sides does not need, and members packed toward the bottom
 * (`packFrames`) leave room above. Innermost frames first, so a parent closes round its children as they end up. Any
 * other graph keeps its frames.
 */
export function tightFrames(
  graph: LayoutGraph,
  frames: readonly PlacedGroup[],
  rects: ReadonlyMap<string, Rect>,
): PlacedGroup[] {
  if (graph.given?.direction !== 'right') return [...frames];
  const containers = graph.containers ?? [];
  const out = new Map(frames.map((f) => [f.id, f.rect]));
  const depth = (id: string): number => {
    const parent = containers.find((c) => c.id === id)?.parent;
    return parent === undefined ? 0 : 1 + depth(parent);
  };
  for (const c of [...containers].sort((a, b) => depth(b.id) - depth(a.id))) {
    const f = out.get(c.id);
    if (f === undefined) continue;
    const inner = [
      ...c.members.flatMap((m) => rects.get(m) ?? []),
      ...containers.filter((k) => k.parent === c.id).flatMap((k) => out.get(k.id) ?? []),
    ];
    if (inner.length === 0) continue;
    const right = Math.max(...inner.map((r) => r.x + r.w)) + c.pad;
    const bottom = Math.min(f.y + f.h, Math.max(...inner.map((r) => r.y + r.h)) + c.pad);
    const top = Math.max(f.y, Math.min(...inner.map((r) => r.y)) - c.top);
    out.set(c.id, { ...f, y: top, w: Math.min(f.w, right - f.x), h: bottom - top });
  }
  return frames.map((f) => ({ ...f, rect: out.get(f.id) ?? f.rect }));
}
