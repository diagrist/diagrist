import type { Tone } from '@diagrist/core';
import type { Span } from '@diagrist/lang';
import type { Decision } from '@diagrist/parts';
import type { ClassArrow } from './grammar/relation.js';

/** A class diagram as the model reads it: classifiers, packages, n-ary associations, relations and notes. */
export interface ClassDiagram {
  readonly title: string;
  readonly subtitle?: string;
  readonly look: 'plain' | 'cards';
  /** Where findings about the diagram as a whole point: the header line. */
  readonly span: Span;
  readonly classifiers: readonly Classifier[];
  readonly packages: readonly Package[];
  readonly associations: readonly NaryAssociation[];
  readonly relations: readonly ClassRelation[];
  readonly notes: readonly ClassNote[];
  readonly decisions: readonly Decision[];
}

/** What a classifier is; it decides the keyword above the name and the compartments. */
export type ClassifierKind = 'class' | 'interface' | 'enum';

export interface Member {
  /** The UML text as written, trimmed. */
  readonly text: string;
  readonly static: boolean;
  readonly abstract: boolean;
  readonly span: Span;
}

export interface Classifier {
  readonly kind: ClassifierKind;
  readonly id: string;
  readonly label: string;
  readonly package?: string;
  readonly abstract: boolean;
  readonly stereotype?: string;
  readonly template?: string;
  readonly members: readonly Member[];
  readonly tone?: Tone;
  readonly mark?: string;
  readonly emph?: boolean;
  readonly span: Span;
}

export interface Package {
  readonly id: string;
  readonly label: string;
  readonly parent?: string;
  readonly tone?: Tone;
  readonly span: Span;
}

/** The diamond of an n-ary association; its legs are relations with it at one end. */
export interface NaryAssociation {
  readonly id: string;
  readonly label: string;
  readonly package?: string;
  readonly via?: string;
  readonly mark?: string;
  readonly emph?: boolean;
  readonly span: Span;
}

/** What a relation is, by its arrow. */
export type RelationKind =
  | 'association'
  | 'directed'
  | 'bidirectional'
  | 'dependency'
  | 'generalization'
  | 'realization'
  | 'aggregation'
  | 'composition';

/** The kind each arrow of `rel` stands for. */
export const KIND_OF: Readonly<Record<ClassArrow, RelationKind>> = {
  '--': 'association',
  '->': 'directed',
  '<->': 'bidirectional',
  '-->': 'dependency',
  '-|>': 'generalization',
  '--|>': 'realization',
  'o--': 'aggregation',
  '*--': 'composition',
};

export interface ClassRelation {
  readonly from: string;
  readonly to: string;
  readonly arrow: ClassArrow;
  readonly kind: RelationKind;
  readonly label?: string;
  /** Multiplicity and role at `from`. */
  readonly source?: string;
  readonly srole?: string;
  /** Multiplicity and role at `to`. */
  readonly card?: string;
  readonly role?: string;
  readonly nonav?: 'from' | 'to' | 'both';
  /** The association class. */
  readonly via?: string;
  /** `«import»` or `«access»` of a package dependency. */
  readonly keyword?: 'import' | 'access';
  readonly emph?: boolean;
  readonly span: Span;
}

export interface ClassNote {
  readonly text: string;
  /** The classifier; a note without it is reported and not drawn. */
  readonly on?: string;
  readonly span: Span;
}
