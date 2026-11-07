import type { EdgeLabel } from '../label/types.js';

/**
 * The lines of every text as one block, the rectangle around them, as the line check reads a turned text once it is
 * turned back: a turned text stands in the stages as a column of empty lines (`turnedLabel`), and measured line by
 * line a line through it would count once per line, ten times a line through a box, which no search should weigh.
 */
export function textBlocks(labels: readonly EdgeLabel[]): EdgeLabel[] {
  const blocks = new Map<number, EdgeLabel>();
  for (const l of labels) {
    const b = blocks.get(l.route);
    if (b === undefined) {
      blocks.set(l.route, l);
      continue;
    }
    const x = Math.min(b.box.x, l.box.x);
    const y = Math.min(b.box.y, l.box.y);
    const w = Math.max(b.box.x + b.box.w, l.box.x + l.box.w) - x;
    const h = Math.max(b.box.y + b.box.h, l.box.y + l.box.h) - y;
    blocks.set(l.route, { ...b, box: { x, y, w, h } });
  }
  return [...blocks.values()];
}
