import type { Point } from './geometry.js';
import type { Font } from './text.js';

/** What a role looks like: its CSS classes and, for paths, the markers at its ends. */
export interface RoleStyle {
  readonly classes: readonly string[];
  /** Id of a `Marker` drawn at the end of the path. */
  readonly marker?: string;
  /** Id of a `Marker` drawn at the start of the path, such as a diamond at the whole of a part. */
  readonly markerStart?: string;
  /**
   * Presentation attributes written after the class, such as `stroke="#e4e4e7"`. Only for pictures that must keep
   * the predecessor's bytes, which painted a few shapes inline (docs/burn-down.md); a theme replaces them with the role.
   */
  readonly paint?: string;
}

/** One CSS rule for a class, as declarations like `fill: none; stroke: #18181b;`. */
export interface StyleRule {
  readonly name: string;
  readonly declarations: string;
  /** Written even when no shape uses the class; otherwise only used classes reach the stylesheet. */
  readonly always?: boolean;
}

/**
 * The outline of a marker in a grid of 12 by 12 units, scaled to `Styles.markerSize`. The point (11, 6) sits on the
 * end of the line, and the line arrives from the left. `closed` closes the outline, so its class can fill it.
 */
export interface MarkerShape {
  readonly points: readonly Point[];
  readonly closed?: boolean;
}

/**
 * Common marker outlines as data. Fill and stroke come from the marker's class, so `triangle` is a filled head or,
 * with a class that fills it with the canvas, a hollow one.
 */
export const MARKER_SHAPES: {
  readonly hook: MarkerShape;
  readonly triangle: MarkerShape;
  readonly diamond: MarkerShape;
} = {
  hook: {
    points: [
      [1, 1],
      [11, 6],
      [1, 11],
    ],
  },
  triangle: {
    points: [
      [1, 1],
      [11, 6],
      [1, 11],
    ],
    closed: true,
  },
  diamond: {
    points: [
      [1, 6],
      [6, 2.5],
      [11, 6],
      [6, 9.5],
    ],
    closed: true,
  },
};

/** A marker in `<defs>`, referenced as `url(#m-<id>)`: an outline and the class that paints it. */
export interface Marker {
  readonly id: string;
  readonly shape: MarkerShape;
  /** Class of the marker path. */
  readonly name: string;
  /** `auto-start-reverse` turns the marker around at the start of a path, as an arrowhead there needs. */
  readonly orient?: 'auto' | 'auto-start-reverse';
}

/** A pictogram as path data in a square of `size` units, drawn with the class of the shape's role. */
export interface Icon {
  readonly size: number;
  readonly paths: readonly string[];
  /**
   * The predecessor's inner SVG markup. An icon with it is written as the predecessor wrote it, a `<g transform>`
   * with the role's `paint` instead of a class, to keep its bytes (docs/burn-down.md); `paths` stay the clean form.
   */
  readonly markup?: string;
}
/**
 * A plugin's style table (ADR 0008): roles to classes, classes to CSS, fonts by role, arrowheads. The kernel
 * writes it into the SVG; a look or a corporate theme is another table.
 */
export interface Styles {
  /** Class of the `<svg>` element; every rule is scoped below it. */
  readonly root: string;
  readonly fontFamily: string;
  /**
   * `none` writes `font-kerning: none` on the root. Layout measures advances without kerning, so a picture in a
   * proportional face switches it off to be drawn as wide as it was measured (ADR 0022).
   */
  readonly fontKerning?: 'none';
  /** Font size of the root, inherited by texts without their own. */
  readonly fontSize: number;
  /** Background colour of the picture. */
  readonly canvas: string;
  /** Edge length of an arrowhead in pixels. */
  readonly markerSize: number;
  readonly markers: readonly Marker[];
  readonly roles: Readonly<Record<string, RoleStyle>>;
  /** In stylesheet order. */
  readonly rules: readonly StyleRule[];
  readonly fonts: Readonly<Record<string, Font>>;
  /** Pictograms that `icon` shapes name, by name. */
  readonly icons?: Readonly<Record<string, Icon>>;
}
