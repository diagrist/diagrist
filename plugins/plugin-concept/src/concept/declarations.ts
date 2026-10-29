import type { Locale, Span } from '@diagrist/lang';

/** How the items of a type are drawn. */
export const SHAPES = ['box', 'round', 'person', 'store', 'doc'] as const;
export type ShapeName = (typeof SHAPES)[number];

/** How the line of a link is drawn, and the head at its second item. */
export const LINES = ['solid', 'dashed', 'dotted'] as const;
export type LineName = (typeof LINES)[number];
export const HEADS = ['arrow', 'open', 'triangle', 'diamond', 'none'] as const;
export type HeadName = (typeof HEADS)[number];

/** The items a count of `each=` or `single=` applies to: those of the `from` types, the `to` types, or both. */
export const ENDS = ['from', 'to', 'both'] as const;
export type End = (typeof ENDS)[number];

/** A label in every locale; a declaration of the file has one text for all of them. */
export type Label = Readonly<Record<Locale, string>>;

/** Where a declaration comes from: a line of the file, or the vocabulary the header names. */
export type Origin = { readonly file: Span } | { readonly vocabulary: string };

/** A declared type of thing. */
export interface TypeDecl {
  readonly id: string;
  readonly label: Label;
  readonly shape: ShapeName;
  readonly explain: boolean;
  readonly origin: Origin;
}

/** A declared type of relation, with the rules it states. */
export interface LinkDecl {
  readonly id: string;
  readonly label: Label;
  readonly from: readonly string[];
  readonly to: readonly string[];
  readonly line: LineName;
  readonly head: HeadName;
  readonly each?: End;
  readonly single?: End;
  readonly acyclic: boolean;
  readonly upward: boolean;
  readonly beside: boolean;
  readonly bare: boolean;
  readonly origin: Origin;
}

/** Whether a count stated for `end` applies to the items at the given side of a relation. */
export const counts = (end: End | undefined, side: 'from' | 'to'): boolean => end === side || end === 'both';
