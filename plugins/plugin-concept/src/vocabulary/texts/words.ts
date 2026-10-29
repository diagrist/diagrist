import type { GraphWords } from '../../shared/graph/model.js';

/** The words of vocabulary pictures in one locale: the kind, the rules of a link, the sentences of the description. */
export interface VocabularyWords extends GraphWords {
  readonly kind: string;
  /** At least one, at most one, or exactly one relation for every item of a type. */
  readonly count: (count: 'each' | 'single' | 'one', type: string) => string;
  readonly acyclic: string;
  /** The entry of a type that asks every item for an entry of its own. */
  readonly explain: string;
  readonly diagram: (title: string, types: number, links: number) => string;
  /** A link as a sentence: its first types, what it says, its second types and its rules. */
  readonly link: (from: readonly string[], says: string, to: readonly string[], rules: readonly string[]) => string;
}
