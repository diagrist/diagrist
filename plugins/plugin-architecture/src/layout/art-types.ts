import type { Rect, Tone } from '@diagrist/core';
import type { BlockForm } from './measure.js';
import type { TabArt } from './tab.js';

/** A point where a text or a mark is anchored. */
export interface Spot {
  readonly x: number;
  readonly y: number;
}

/** A segment from (x1, y1) to (x2, y2). */
export interface Segment {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/** A stick figure: head, body, arms, legs and the anchors of name and role below. */
export interface PersonArt {
  readonly kind: 'person';
  readonly head: { readonly cx: number; readonly cy: number; readonly r: number };
  readonly body: Segment;
  readonly arms: Segment;
  readonly legs: readonly [Segment, Segment];
  readonly label: Spot;
  /** The indented lines of the element, between name and role. */
  readonly lines: readonly Spot[];
  readonly tech: Spot;
}

/** The parts of a node of the `card` family: the toned circle, its icon, and cards stacked behind for replicas. */
export interface CardArt {
  readonly form: 'card' | 'circle';
  readonly circle?: { readonly cx: number; readonly cy: number; readonly r: number };
  readonly icon?: string;
  readonly stack: readonly Rect[];
}

/** A node of the `block` family: its form and tone, white text on dark tones, and for a tube its arrow and body. */
export interface BlockArt {
  readonly form: BlockForm;
  readonly tone: Tone;
  readonly dark: boolean;
  readonly flow?: Segment;
  readonly pipe?: Rect;
}

/** A box: where icon, name, second line, status, clock and replica tag stand, and what its node family adds. */
export interface BoxArt {
  readonly kind: 'box';
  readonly icon: Spot & { readonly size: number };
  readonly label: Spot;
  /** The indented lines of the element, one below the other between the name and the second line. */
  readonly lines: readonly Spot[];
  readonly tech: Spot;
  readonly status: Spot;
  /** Texts centred on their spots, as `nodeAlign: middle` sets them in a box; cards, blocks and tabs centre anyway. */
  readonly middle?: boolean;
  readonly clock: Spot;
  readonly replicas: Spot;
  readonly card?: CardArt;
  readonly block?: BlockArt;
  /** With `nodeName: tab`: the name cut into the top edge, icon and second line centred below. */
  readonly tab?: TabArt;
}

/** Where everything inside a node stands; the scene only draws it. */
export type NodeArt = PersonArt | BoxArt;
