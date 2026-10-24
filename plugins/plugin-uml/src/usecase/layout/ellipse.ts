import { textWidth } from '@diagrist/core';
import { wrapTwo } from '@diagrist/layout-grid';
import type { UseCase } from '../diagram.js';
import type { UcText, UseCaseArt } from './art.js';
import { UC_FONTS as F, snap, UC } from './metrics.js';

/** Heading of the compartment, as in UML 2.5.1, figure 18.2. */
export const POINTS_HEADING = 'extension points';

/** The name in one or two lines; long names wrap so the ellipse does not grow flat. */
export const nameLines = (label: string): string[] => (label.length > UC.wrap ? wrapTwo(label) : [label]);

/** `«batch»` from `batch`. */
export const stereoText = (s: string): string => `«${s}»`;

/** The text block of a use case: width and height, the part of stereotype and name, the stereotype line. */
export interface Block {
  readonly width: number;
  readonly height: number;
  readonly nameH: number;
  readonly head: number;
}

export function block(u: UseCase): Block {
  const names = nameLines(u.label);
  const head = u.stereotype ? UC.pointH : 0;
  const stereoW = u.stereotype ? textWidth(stereoText(u.stereotype), F.stereo) : 0;
  const nameW = Math.max(stereoW, ...names.map((n) => textWidth(n, F.ucName)));
  const nameH = head + names.length * UC.lineH;
  if (!u.points.length) return { width: nameW, height: nameH, nameH, head };
  const pointW = Math.max(textWidth(POINTS_HEADING, F.stereo), ...u.points.map((p) => textWidth(p, F.member)));
  const height = nameH + 2 * UC.ruleGap + (u.points.length + 1) * UC.pointH;
  return { width: Math.max(nameW, pointW), height, nameH, head };
}

/** Small ellipse at the top right of the classifier notation: half axes and distance to the edge. */
const ICON = { rx: 9, ry: 5, inset: 6 } as const;

/**
 * Size of a use case. The ellipse is as high as the text block plus air, and so wide that the corners of the block
 * lie inside, plus a margin; the classifier rectangle leaves room for its icon. Snapped to the grid, at least the
 * minimum of the learning platform.
 */
export function useCaseSize(u: UseCase): { readonly w: number; readonly h: number } {
  const b = block(u);
  if (u.classifier) {
    const side = Math.max(UC.padX, 2 * ICON.rx + 2 * ICON.inset);
    const w = snap(b.width + 2 * side);
    const h = snap(b.height + 2 * (ICON.inset + 2 * ICON.ry));
    return { w: Math.max(UC.minW, w), h: Math.max(UC.minH, h) };
  }
  const ry = b.height / 2 + UC.padY + UC.round;
  const fit = Math.sqrt(1 - (b.height / 2 / ry) ** 2);
  const rx = b.width / 2 / fit + UC.padX;
  return { w: Math.max(UC.minW, snap(2 * rx)), h: Math.max(UC.minH, snap(2 * ry)) };
}

/** Baseline of a line: its middle plus a good third of the font size. */
const base = (top: number, lineH: number, size: number) => top + lineH / 2 + Math.round(size * 0.36);

const halfWidth = (rx: number, ry: number, dy: number) => rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2));

/** Stereotype, name and compartment of a use case placed in `rect`. */
export function useCaseArt(u: UseCase, rect: { x: number; y: number; w: number; h: number }): UseCaseArt {
  const [cx, cy, rx, ry] = [rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w / 2, rect.h / 2];
  const b = block(u);
  const top = cy - b.height / 2;
  const name = nameLines(u.label).map((text, i) => ({
    text,
    x: cx,
    y: base(top + b.head + i * UC.lineH, UC.lineH, F.ucName.size),
  }));
  const shape = u.classifier
    ? {
        box: rect,
        icon: {
          cx: rect.x + rect.w - ICON.inset - ICON.rx,
          cy: rect.y + ICON.inset + ICON.ry,
          rx: ICON.rx,
          ry: ICON.ry,
        },
      }
    : {};
  const stereotype: UcText | undefined = u.stereotype
    ? { text: stereoText(u.stereotype), x: cx, y: base(top, b.head, F.stereo.size) }
    : undefined;
  const art = { kind: 'usecase', cx, cy, rx, ry, ...shape, ...(stereotype ? { stereotype } : {}), name } as const;
  if (!u.points.length) return { ...art, points: [] };
  const ruleY = top + b.nameH + UC.ruleGap;
  const half = u.classifier ? rx : halfWidth(rx, ry, ruleY - cy);
  const listTop = ruleY + UC.ruleGap;
  return {
    ...art,
    rule: { x1: cx - half, y1: ruleY, x2: cx + half, y2: ruleY },
    heading: { text: POINTS_HEADING, x: cx, y: base(listTop, UC.pointH, F.stereo.size) },
    points: u.points.map((text, i) => ({
      text,
      x: cx,
      y: base(listTop + (i + 1) * UC.pointH, UC.pointH, F.member.size),
    })),
  };
}
