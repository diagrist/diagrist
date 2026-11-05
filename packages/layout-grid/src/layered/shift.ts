import type { Rect } from '@diagrist/core';
import type { LayeredLayout } from './output.js';

const moved = (r: Rect, dx: number): Rect => ({ ...r, x: r.x + dx });

/**
 * The layout moved right until nothing stands left of `floor`: no box, line, text or frame leaves the picture at its
 * left edge, where a frame grown for the head of a line or a line around a frame could reach.
 */
export function keptInside(layout: LayeredLayout, floor: number): LayeredLayout {
  const low = Math.min(
    ...layout.nodes.map((n) => n.rect.x),
    ...layout.routes.flatMap((r) => r.points.map((p) => p[0])),
    ...layout.labels.map((l) => l.box.x),
    ...(layout.frames ?? []).map((f) => f.rect.x),
  );
  const dx = Math.ceil(floor - low);
  if (!(dx > 0)) return layout;
  return {
    ...layout,
    nodes: layout.nodes.map((n) => ({ ...n, rect: moved(n.rect, dx) })),
    routes: layout.routes.map((r) => ({ ...r, points: r.points.map(([x, y]) => [x + dx, y] as const) })),
    labels: layout.labels.map((l) => ({
      ...l,
      x: l.x + dx,
      box: moved(l.box, dx),
      ...(l.frame ? { frame: { ...l.frame, rect: moved(l.frame.rect, dx) } } : {}),
    })),
    placed: layout.placed.map((p) => ({ ...p, rect: moved(p.rect, dx) })),
    width: layout.width + dx,
    ...(layout.frame
      ? {
          frame: {
            rect: moved(layout.frame.rect, dx),
            head: { ...layout.frame.head, x: layout.frame.head.x + dx, box: moved(layout.frame.head.box, dx) },
          },
        }
      : {}),
    ...(layout.frames ? { frames: layout.frames.map((f) => ({ ...f, rect: moved(f.rect, dx) })) } : {}),
  };
}
