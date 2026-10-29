/** The words of concept pictures in one locale: the kind, the statuses, the sentences of the description. */
export interface ConceptWords {
  readonly kind: string;
  readonly status: Readonly<Record<'planned' | 'deprecated', string>>;
  readonly diagram: (title: string, items: number, types: number) => string;
  /** The items of one type: the type's name, then their names. */
  readonly type: (label: string, items: readonly string[]) => string;
  /** One relation as a sentence: first item, what the link says, second item, and its own text. */
  readonly relation: (from: string, says: string, to: string, label: string | undefined) => string;
  /** An item's entries, after its name. */
  readonly entries: (item: string, entries: readonly string[]) => string;
}

/** The end of a sentence: the text without a stop of its own, then a stop. */
export const stop = (text: string): string => `${text.replace(/[.!?]$/, '')}.`;
