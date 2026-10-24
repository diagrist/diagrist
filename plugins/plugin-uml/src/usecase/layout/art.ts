import type { Point, Rect } from '@diagrist/core';

/** A line of text centred on its anchor. */
export interface UcText {
  readonly text: string;
  readonly x: number;
  readonly y: number;
}

/** A straight piece, such as a limb of the stick figure or the line over the compartment. */
export interface Segment {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/** An ellipse by centre and half axes. */
export interface Oval {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
}

/** A use case: its ellipse (or the rectangle of the classifier notation), name and compartment. */
export interface UseCaseArt extends Oval {
  readonly kind: 'usecase';
  /** Classifier notation: a rectangle instead of the ellipse, with a small ellipse at the top right. */
  readonly box?: Rect;
  readonly icon?: Oval;
  readonly stereotype?: UcText;
  readonly name: readonly UcText[];
  /** The line over the compartment of extension points, a chord of the ellipse. */
  readonly rule?: Segment;
  readonly heading?: UcText;
  readonly points: readonly UcText[];
}

/** Head, body, arms and legs in a field of 40 by 58, as the learning platform draws actors. */
export interface StickFigure {
  readonly head: { readonly cx: number; readonly cy: number; readonly r: number };
  readonly body: Segment;
  readonly arms: Segment;
  readonly legs: readonly [Segment, Segment];
}

/** An actor: a stick figure with its role below, or as a system a box with `«actor»` above the name. */
export interface ActorArt {
  readonly kind: 'actor';
  readonly figure?: StickFigure;
  readonly box?: Rect;
  readonly stereotype?: UcText;
  readonly name: readonly UcText[];
}

/** A comment with a folded corner, joined to its element or extend line by a dashed `link`. */
export interface Comment {
  /** The element of a note; undefined on an extend line. */
  readonly on?: string;
  /** Index of the route of an extend line; undefined on a note. */
  readonly route?: number;
  readonly rect: Rect;
  readonly link: readonly [Point, Point];
  /** Lines of a note on an element; the lines of an extend note are labels of their line. */
  readonly lines: readonly { readonly text: string; readonly x: number; readonly y: number }[];
  /** Weighed conflicts of box and link; 0 is a free spot. */
  readonly conflicts: number;
}
