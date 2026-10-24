import type { Font } from './text.js';

/** What a role looks like: its CSS classes and, for paths, the arrowhead at the end. */
export interface RoleStyle {
  readonly classes: readonly string[];
  /** Id of a `Marker` drawn at the end of the path. */
  readonly marker?: string;
}

/** One CSS rule for a class, as declarations like `fill: none; stroke: #18181b;`. */
export interface StyleRule {
  readonly name: string;
  readonly declarations: string;
  /** Written even when no shape uses the class; otherwise only used classes reach the stylesheet. */
  readonly always?: boolean;
}

/** An arrowhead in `<defs>`, referenced as `url(#m-<id>)`: an open hook or a filled triangle. */
export interface Marker {
  readonly id: string;
  readonly filled: boolean;
  /** Class of the arrowhead path. */
  readonly name: string;
}

/**
 * A plugin's style table (ADR 0008): roles to classes, classes to CSS, fonts by role, arrowheads. The kernel
 * writes it into the SVG; a look or a corporate theme is another table.
 */
export interface Styles {
  /** Class of the `<svg>` element; every rule is scoped below it. */
  readonly root: string;
  readonly fontFamily: string;
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
}
