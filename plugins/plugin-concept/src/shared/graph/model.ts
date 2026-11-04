import type { Areas } from '@diagrist/core';
import type { Span } from '@diagrist/lang';
import type { LinkDecl, TypeDecl } from '../declarations.js';

/** One thing of a declared type, with its entries. */
export interface Item {
  readonly id: string;
  readonly label: string;
  readonly type: string;
  readonly status?: 'planned' | 'deprecated';
  /** The area it belongs to (ADR 0033). */
  readonly area?: string;
  readonly entries: readonly string[];
  readonly span: Span;
}

/** One relation between two items, by its link. */
export interface Relation {
  readonly from: string;
  readonly link: string;
  readonly to: string;
  readonly label?: string;
  /** The area the relation names itself; the scene falls back to the areas of its items. */
  readonly area?: string;
  readonly span: Span;
}

/** What the graph picture draws: declared types and links, and the items and relations drawn with them. */
export interface Graph {
  readonly title: string;
  readonly subtitle?: string;
  readonly types: ReadonlyMap<string, TypeDecl>;
  readonly links: ReadonlyMap<string, LinkDecl>;
  readonly items: readonly Item[];
  readonly relations: readonly Relation[];
  /** How the items stand: a column per type, or layers along the relations; left out, columns for several types. */
  readonly arrange?: 'columns' | 'layers' | 'hub';
  /** The areas of the picture (ADR 0033); a picture without the statement `area` has none. */
  readonly areas?: Areas;
}

/** The words the graph picture adds itself: the statuses in its legend. */
export interface GraphWords {
  readonly status: Readonly<Record<'planned' | 'deprecated', string>>;
}
