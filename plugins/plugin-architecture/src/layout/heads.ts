import { type Point, type Rect, textWidth } from '@diagrist/core';
import type { Look } from '../looks/look.js';
import type { ArchGroup } from '../model/types.js';
import type { Spot } from './art.js';
import { tagWidth } from './frame-cell.js';
import { linesHit } from './geometry.js';
import { BLOCK_DY, headRect, TITLE_INSET, TITLE_PAD } from './head-rect.js';
import { headingSize } from './spec.js';

/** Head and tag of a frame, from its finished rectangle. */
export interface FrameHead {
  readonly title: Spot;
  readonly subtitle: Spot;
  /** With the head `onLine`: the ground the title stands on, cut out of the frame line. */
  readonly titleBox?: Rect;
  /** With the head `centre`: the title stands in the middle at the top. */
  readonly titleAnchor?: 'middle';
  /** A tag at the right, in the vertical middle. */
  readonly tag?: { readonly rect: Rect; readonly text: Spot };
}

const SIDE_DY = 1;

/**
 * Where the head of a frame stands: on the side for `heading=side`, else as `groups.head` of the look says: top left,
 * in the middle at the top, moving aside along the top edge when one of `routes` crosses it there (owner decision D3
 * of 07.11.2026), or on the frame line, moving to the right end of the line when one of `lines` ends at the title.
 */
export function frameHead(
  rect: Rect,
  g: ArchGroup,
  look: Look,
  lines: readonly (readonly Point[])[],
  routes: readonly (readonly Point[])[] = lines,
): FrameHead {
  const m = look.metrics;
  const head = look.options.groups.head;
  const right = rect.x + rect.w;
  const middle = rect.y + rect.h / 2;
  const tw = g.tag ? tagWidth(g.tag, look) : 0;
  const tag = g.tag
    ? {
        tag: {
          rect: { x: right - m.groupPadX - tw, y: middle - m.nodeH / 2, w: tw, h: m.nodeH },
          text: { x: right - m.groupPadX - tw / 2, y: middle + m.labelDy },
        },
      }
    : {};
  if (g.heading === 'side') {
    const spot = { x: rect.x + m.groupPadX, y: middle + m.labelDy + SIDE_DY };
    return { title: spot, subtitle: spot, ...tag };
  }
  if (head === 'centre') {
    const spot = {
      x: clearAlong(rect, headRect(g, look, ''), routes, m.groupPadX, m.grid),
      y: rect.y + m.groupTitleY + BLOCK_DY,
    };
    return { title: spot, subtitle: spot, titleAnchor: 'middle', ...tag };
  }
  if (head === 'corner')
    return {
      title: { x: rect.x + m.groupTextX, y: rect.y + m.groupTitleY },
      subtitle: { x: rect.x + m.groupTextX, y: rect.y + m.groupSubtitleY },
      ...tag,
    };
  const size = headingSize(look);
  const w = textWidth(g.title, look.fonts.heading) + 2 * TITLE_PAD;
  const left = { x: rect.x + TITLE_INSET, y: rect.y - size / 2 - 2, w, h: size + 4 };
  const box = linesHit(lines, left, 4) ? { ...left, x: right - TITLE_INSET - w } : left;
  const title = { x: box.x + TITLE_PAD, y: rect.y + size / 2 - 2 };
  return { title, subtitle: title, titleBox: box, ...tag };
}

/**
 * The middle of a head centred on the top edge of `rect` (`head`, relative to the middle of the edge), moved by whole
 * steps of `step` to the nearest place where none of `lines` comes within `step` of it, the left one first, `pad` inside the
 * frame's sides; the middle of the edge where it is clear or no place is.
 */
function clearAlong(
  rect: Rect,
  head: ReturnType<typeof headRect>,
  lines: readonly (readonly Point[])[],
  pad: number,
  step: number,
): number {
  const middle = rect.x + rect.w / 2;
  if (!head) return middle;
  const at = (x: number): Rect => ({ x: x - head.w / 2, y: rect.y + head.y, w: head.w, h: head.h });
  const [lo, hi] = [rect.x + pad + head.w / 2, rect.x + rect.w - pad - head.w / 2];
  for (let d = 0; middle - d >= lo || middle + d <= hi; d += step)
    for (const x of [middle - d, middle + d]) if (x >= lo && x <= hi && !linesHit(lines, at(x), step)) return x;
  return middle;
}
