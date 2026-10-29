import type { Span } from '@diagrist/lang';
import type { LinkDecl, TypeDecl } from '../declarations.js';

/** One thing of a declared type, with its entries. */
export interface Item {
  readonly id: string;
  readonly label: string;
  readonly type: string;
  readonly status?: 'planned' | 'deprecated';
  readonly entries: readonly string[];
  readonly span: Span;
}

/** One relation between two items, by its link. */
export interface Relation {
  readonly from: string;
  readonly link: string;
  readonly to: string;
  readonly label?: string;
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
}

/** The words the graph picture adds itself: the statuses in its legend. */
export interface GraphWords {
  readonly status: Readonly<Record<'planned' | 'deprecated', string>>;
}
