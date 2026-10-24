import { type Point, type Rect, textWidth } from '@diagrist/core';
import type { ArchGroup } from '../model/types.js';
import type { Spot } from './art.js';
import { linesHit } from './geometry.js';
import type { Sizing } from './measure.js';
import { headingSize, tagWidth } from './spec.js';

/** Head and tag of a frame, from its finished rectangle. */
export interface FrameHead {
  readonly title: Spot;
  readonly subtitle: Spot;
  /** In `look=cards`: the ground the title stands on, cut out of the frame line. */
  readonly titleBox?: Rect;
  /** In `look=blocks`: the title stands in the middle at the top. */
  readonly titleAnchor?: 'middle';
  /** A tag at the right, in the vertical middle. */
  readonly tag?: { readonly rect: Rect; readonly text: Spot };
}

const TITLE_INSET = 24;
const TITLE_PAD = 8;
const SIDE_DY = 1;
const BLOCK_DY = 4;

/**
 * Where the head of a frame stands: top left, on the side for `heading=side`, in the middle in blocks, on the frame
 * line in cards, moving to the right end of the line when one of `lines` ends at the title.
 */
export function frameHead(rect: Rect, g: ArchGroup, sizing: Sizing, lines: readonly (readonly Point[])[]): FrameHead {
  const m = sizing.m;
  const right = rect.x + rect.w;
  const middle = rect.y + rect.h / 2;
  const tw = g.tag ? tagWidth(g.tag, sizing) : 0;
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
  if (sizing.look === 'blocks') {
    const spot = { x: rect.x + rect.w / 2, y: rect.y + m.groupTitleY + BLOCK_DY };
    return { title: spot, subtitle: spot, titleAnchor: 'middle', ...tag };
  }
  if (sizing.look === 'plain' || sizing.look === 'paper')
    return {
      title: { x: rect.x + m.groupTextX, y: rect.y + m.groupTitleY },
      subtitle: { x: rect.x + m.groupTextX, y: rect.y + m.groupSubtitleY },
      ...tag,
    };
  const size = headingSize(sizing);
  const w = textWidth(g.title, m.fonts.heading) + 2 * TITLE_PAD;
  const left = { x: rect.x + TITLE_INSET, y: rect.y - size / 2 - 2, w, h: size + 4 };
  const box = linesHit(lines, left, 4) ? { ...left, x: right - TITLE_INSET - w } : left;
  const title = { x: box.x + TITLE_PAD, y: rect.y + size / 2 - 2 };
  return { title, subtitle: title, titleBox: box, ...tag };
}
