import type { Point, Rect } from '../geometry.js';

/** A box lines are drawn between or must avoid, with the outline drawn in its rectangle. */
export interface LineNode {
  readonly id: string;
  readonly rect: Rect;
  /** The shape in `rect`: the rectangle itself (default) or the ellipse inscribed in it. */
  readonly outline?: 'rectangle' | 'ellipse';
  /** Id of the box or line this one is part of, such as a marker on the border of a box; its lines may touch it. */
  readonly owner?: string;
}

/** A drawn line: the edge it stands for, its ends and its points from the start to the head. */
export interface LineRoute {
  readonly edge: string;
  readonly from: string;
  readonly to: string;
  readonly points: readonly Point[];
  /**
   * Ids of the bundles the line belongs to. Lines sharing a bundle may share a trunk and a port, and their meeting
   * is no crossing.
   */
  readonly bundles?: readonly string[];
  /** Weight of the line in the summed length; 1 by default. */
  readonly weight?: number;
}

/** A text on a line, keyed uniquely, with the edge it says something about. */
export interface LineLabel {
  readonly key: string;
  readonly edge: string;
  readonly box: Rect;
}

/** Any other text in the picture, such as the name of a box drawn beside it or a heading. */
export interface LineText {
  readonly key: string;
  readonly rect: Rect;
  /** Id of the box, frame or line the text belongs to; lines of that owner may touch it. */
  readonly owner?: string;
}

/** A frame around boxes. Lines cross its border freely; its head, if it has one, is an obstacle. */
export interface LineFrame {
  readonly id: string;
  readonly rect: Rect;
  readonly head?: Rect;
}

/** What the line check reads: everything placed, in picture pixels. */
export interface LineInput {
  readonly nodes: readonly LineNode[];
  readonly routes: readonly LineRoute[];
  readonly labels?: readonly LineLabel[];
  readonly texts?: readonly LineText[];
  readonly frames?: readonly LineFrame[];
  /** Size of the picture; without it, the extent of what was placed. */
  readonly width?: number;
  readonly height?: number;
}

/**
 * The hard rules of a presentable picture, in the order they are reported: lines that cross (Q1), a line through a
 * box, a text or the head of a frame (Q2), too many bends (Q3), a short run into the head (Q4) or out of the start
 * (Q5), a tiny jog (Q6), foreign parallel lines too close (Q7), crowded or interleaved ports on one side (Q8), and
 * a text on a line that is far from it or near another (Q9).
 */
export const LINE_RULES = [
  'crossing',
  'through',
  'bends',
  'lead',
  'tail',
  'jog',
  'parallel',
  'ports',
  'label',
] as const;

/** One of `LINE_RULES`. */
export type LineRule = (typeof LINE_RULES)[number];

/** A breach of a hard rule as data: which rule, which edges, where, and what was measured. */
export interface LineFinding {
  readonly rule: LineRule;
  /** Ids of the edges involved, sorted. */
  readonly edges: readonly string[];
  readonly at: Point;
  /** Key of the box, text or frame involved: what a line runs through, what a text overlaps, where the ports are. */
  readonly other?: string;
  /** Key of the text on a line the finding is about. */
  readonly label?: string;
  /**
   * Which way the rule is breached, where it can be several: a line through one of its own ends (`own`), ports too
   * close (`spacing`) or interleaved (`order`), a text far from its line (`far`), near a foreign one (`near`) or on
   * something (`overlap`).
   */
  readonly detail?: 'own' | 'spacing' | 'order' | 'far' | 'near' | 'overlap';
  /** What was measured: a length, a distance or a count. */
  readonly value?: number;
}

/**
 * Thresholds of the hard rules in pixels. A picture drawn small passes smaller ones; the defaults suit the standard
 * look with markers of 12 pixels and lanes 12 pixels apart.
 */
export interface LineThresholds {
  /** Crossings are a breach only up to this many lines, and a measure beyond (Q1). */
  readonly crossingsUpTo: number;
  /** Room a line keeps from boxes and texts that are not its own (Q2). */
  readonly clearance: number;
  /** Bends a line may have (Q3)... */
  readonly bends: number;
  /** ...and a long one, whose ends are further apart than `longGap`, or one that returns to its start. */
  readonly longBends: number;
  readonly longGap: number;
  /** Straight run into the head (Q4) and out of the start (Q5). */
  readonly lead: number;
  readonly tail: number;
  /** Shortest inner segment, and shortest offset between two parallel segments of one line (Q6). */
  readonly jog: number;
  readonly offset: number;
  /** Least distance between overlapping parallel segments of two lines (Q7). */
  readonly parallel: number;
  /** Least distance between two ports on one side of a box (Q8). */
  readonly ports: number;
  /** Farthest a text may stand from its own line, and nearest to a foreign one (Q9). */
  readonly labelNear: number;
  readonly labelClear: number;
}

/** The thresholds of the plan's quality rules. */
export const DEFAULT_THRESHOLDS: LineThresholds = {
  crossingsUpTo: 15,
  clearance: 6,
  bends: 2,
  longBends: 4,
  longGap: 160,
  lead: 24,
  tail: 16,
  jog: 16,
  offset: 24,
  parallel: 12,
  ports: 16,
  labelNear: 8,
  labelClear: 12,
};
