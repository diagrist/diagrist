import type { Tone } from '@diagrist/core';
import type { Span } from '@diagrist/lang';
import type { Decision } from '@diagrist/parts';
import type { RelationArrow } from './grammar/relation.js';

/**
 * A use case diagram as the model reads it: actors, subjects, use cases, relations and notes in source order.
 * The layout places it by itself; the source gives no grid.
 */
export interface UseCaseDiagram {
  readonly title: string;
  readonly subtitle?: string;
  readonly look: 'plain' | 'cards';
  readonly direction?: 'down' | 'right';
  /** Where findings about the diagram as a whole point: the header line. */
  readonly span: Span;
  readonly actors: readonly Actor[];
  readonly subjects: readonly Subject[];
  readonly cases: readonly UseCase[];
  readonly relations: readonly Relation[];
  readonly notes: readonly Note[];
  readonly decisions: readonly Decision[];
}

export interface Actor {
  readonly id: string;
  readonly label: string;
  /** `kind=system`: a box with `«actor»` instead of a stick figure. */
  readonly system: boolean;
  readonly side?: 'left' | 'right';
  readonly tone?: Tone;
  readonly mark?: string;
  readonly emph?: boolean;
  readonly span: Span;
}

export interface Subject {
  readonly id: string;
  readonly label: string;
  readonly tone?: Tone;
  readonly span: Span;
}

export interface UseCase {
  readonly id: string;
  readonly label: string;
  /** Id of the subject it belongs to. */
  readonly subject?: string;
  /** Extension points in their order. */
  readonly points: readonly string[];
  /** `form=classifier`: a rectangle with a small ellipse instead of an ellipse. */
  readonly classifier: boolean;
  readonly stereotype?: string;
  readonly tone?: Tone;
  readonly mark?: string;
  readonly emph?: boolean;
  readonly span: Span;
}

/** What a relation is, from its arrow and, for `-->`, its flag. */
export type RelationKind = 'association' | 'generalization' | 'include' | 'extend';

export interface Relation {
  readonly from: string;
  readonly to: string;
  readonly arrow: RelationArrow;
  /** Undefined when arrow and flags do not name one kind; the rule `relationAttributes` reports it. */
  readonly kind?: RelationKind;
  /** The flags `include` and `extend` as written, for the rule that checks them against the arrow. */
  readonly flagged: readonly ('include' | 'extend')[];
  readonly label?: string;
  readonly source?: string;
  readonly card?: string;
  readonly when?: string;
  /** Extension points of `to` named by `at=`, in their order. */
  readonly at?: readonly string[];
  readonly emph?: boolean;
  readonly span: Span;
}

export interface Note {
  readonly text: string;
  /** Actor, use case or subject; a note without it is reported and not drawn. */
  readonly on?: string;
  readonly span: Span;
}

/** A relation whose arrow and flags name its kind, the only ones the layout draws. */
export type KnownRelation = Relation & { readonly kind: RelationKind };

/** Is the kind of the relation known? */
export const isKnown = (r: Relation): r is KnownRelation => r.kind !== undefined;
