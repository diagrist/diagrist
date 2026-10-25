import type { Rect } from '@diagrist/core';
import type { BandWords } from '../../texts/bands.js';
import type { Texts } from '../../texts/index.js';
import type { Segment } from '../art.js';
import type { Band } from './detect.js';

/** How far a separator keeps from what it breaks for. */
const BREAK = 6;

/**
 * Title and subtitle of a band's head: its frame's title and team, the people's words, the emphasized element in
 * focus, or the neighbours with their count, by keyword when all are of one.
 */
export function headOf(band: Band, texts: Texts, words: BandWords): readonly [string, string] {
  const keywords = new Set(band.nodes.map((n) => n.keyword));
  switch (band.kind) {
    case 'group': {
      const g = band.group;
      return [g?.title ?? '', g?.team ?? (g?.role ? texts.roles[g.role] : '')];
    }
    case 'people':
      return [words.people.title, words.people.subtitle];
    case 'focus':
      return [band.nodes.find((n) => n.emph)?.label ?? '', words.focus];
    case 'neighbours':
      return [words.neighbours, words.count(band.nodes.length, keywords.size === 1 ? [...keywords][0] : undefined)];
  }
}

/** The pieces of a vertical line at `x` from `top` to `bottom` that no obstacle crosses, `BREAK` clear of each. */
export function dotted(x: number, top: number, bottom: number, obstacles: readonly Rect[]): Segment[] {
  const cuts = obstacles
    .filter((o) => o.x - BREAK <= x && o.x + o.w + BREAK >= x && o.y + o.h >= top && o.y <= bottom)
    .map((o) => [o.y - BREAK, o.y + o.h + BREAK] as const)
    .sort((a, b) => a[0] - b[0]);
  const out: Segment[] = [];
  let y = top;
  for (const [from, to] of cuts) {
    if (from > y) out.push({ x1: x, y1: y, x2: x, y2: from });
    y = Math.max(y, to);
  }
  if (y < bottom) out.push({ x1: x, y1: y, x2: x, y2: bottom });
  return out;
}
