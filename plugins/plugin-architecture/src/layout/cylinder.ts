import type { Rect } from '@diagrist/core';

/** The node families that draw a cylinder: outlined boxes and filled blocks. */
type Family = 'box' | 'block';

/**
 * Half the height of a cylinder's lid by node family: the vertical radius of the ellipse on top and of the curve of
 * the base. The scene draws the cylinder with it, and the texts keep clear of it.
 */
export const CYLINDER_RY: Readonly<Record<Family, number>> = { box: 9, block: 12 };

/**
 * The part of a node's rectangle its icon and texts stand in the middle of. For a cylinder (`db`) that is its body
 * below the front of the lid, twice the lid's radius below the top, down to the base where the texts meet it: boxes
 * set them from the left wall on, where the base curves up to one radius above the bottom, so their body ends there;
 * blocks centre them, above the lowest point of the base at the bottom. Every other form gives its whole rectangle.
 */
export function textArea(r: Rect, form: string | undefined, family: Family): Rect {
  if (form !== 'db') return r;
  const ry = CYLINDER_RY[family];
  const base = family === 'box' ? ry : 0;
  return { ...r, y: r.y + 2 * ry, h: r.h - 2 * ry - base };
}
