import type { ClassifierKind, RelationKind } from '../diagram.js';

/** What a relation says beyond its kind: name, multiplicities and roles, association class, blind ends. */
export interface RelationDetails {
  readonly label?: string;
  /** How many `b` belong to one `a`, and the other way round. */
  readonly card?: string;
  readonly source?: string;
  readonly role?: string;
  readonly srole?: string;
  readonly via?: string;
  readonly nonav?: 'from' | 'to' | 'both';
}

/** An end of an n-ary association in words: the class and what stands at it. */
export interface NaryEnd {
  readonly name: string;
  readonly count?: string;
  readonly role?: string;
  readonly navigable: boolean;
}

/** The sentences of a class description in one locale; names are labels, lists are already joined. */
export interface ClassProse {
  readonly summary: (title: string, kind: string, counts: readonly string[], relations: number) => string;
  /** `3 classes`, `1 interface`: a count of one kind of element, or undefined for none. */
  readonly count: (kind: ClassifierKind | 'nary' | 'package', n: number) => string | undefined;
  readonly packageName: (label: string) => string;
  readonly packageLine: (label: string, parent: string | undefined, parts: readonly string[]) => string;
  readonly classifier: (
    kind: ClassifierKind,
    abstract: boolean,
    label: string,
    extras: { readonly stereotype?: string; readonly template?: string },
    attributes: readonly string[],
    operations: readonly string[],
  ) => string;
  /** A member with its traits, such as `+ total() : Money (abstract, static)`. */
  readonly member: (text: string, abstract: boolean, isStatic: boolean) => string;
  readonly relation: (
    kind: RelationKind,
    a: string,
    b: string,
    keyword: string | undefined,
    d: RelationDetails,
  ) => string;
  readonly nary: (label: string, ends: readonly NaryEnd[], via: string | undefined) => string;
  readonly note: (on: string, text: string) => string;
}
