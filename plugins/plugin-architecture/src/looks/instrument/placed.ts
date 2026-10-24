import type { Placed, Rect } from '@diagrist/core';
import type { InstrumentLayout } from './layout.js';

const holds = (outer: Rect, inner: Rect): boolean =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.w <= outer.x + outer.w &&
  inner.y + inner.h <= outer.y + outer.h;

/**
 * What the placement check sees in `look=instrument`: frames and boxes as the shared layout placed them, the texts of
 * an edge as the one tag drawn around them in the frame the layout gave them, flow numbers and marks in the innermost
 * frame that holds them, and callouts on their box, so a tag on another tag or on a box is reported like any label.
 */
export function placedOf(layout: InstrumentLayout): Placed[] {
  const { base } = layout;
  const solid = base.placed.filter((p) => p.kind !== 'text');
  const texts = base.placed.filter((p) => p.kind === 'text');
  const labels = layout.labels.map((t): Placed => {
    const edge = base.routes[t.route ?? -1]?.edge;
    const line = texts.find((p) => p.key.startsWith(`${edge}.label.`));
    return { ...line, key: `${edge}.label`, kind: 'text', rect: t.rect };
  });
  const innermost = (r: Rect) =>
    base.frames
      .filter((f) => holds(f.rect, r))
      .sort((a, b) => a.rect.w * a.rect.h - b.rect.w * b.rect.h)
      .map((f) => f.group.id)[0];
  const loose = layout.tags.map((t, i): Placed => {
    const frame = innermost(t.rect);
    return { key: `tag.${i + 1}`, kind: 'text', rect: t.rect, ...(frame ? { within: frame } : {}) };
  });
  const callouts = layout.callouts.map(
    (c, i): Placed => ({ key: `${c.node}.callout.${i + 1}`, kind: 'text', rect: c.tag.rect, on: c.node }),
  );
  return [...solid, ...labels, ...loose, ...callouts];
}
