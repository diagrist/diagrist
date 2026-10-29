import type { Count, ScaleName } from '../scales.js';

/** The words of matrices in one locale: names of the kind and the scales, the values, the rules, the sentences. */
export interface MatrixWords {
  readonly kind: string;
  readonly scales: Readonly<Record<ScaleName, string>>;
  /** What each value of each scale means, keyed by scale and value id. */
  readonly values: Readonly<Record<ScaleName, Readonly<Record<string, string>>>>;
  /** A rule of a value as the legend states it, such as "exactly one per row". */
  readonly rule: (count: Count, axis: 'row' | 'col') => string;
  readonly diagram: (title: string, rows: number, cols: number, scale: string) => string;
  readonly group: (label: string) => string;
  /** A row in a sentence: its head, then each value with the columns that hold it. */
  readonly row: (label: string, parts: readonly (readonly [string, readonly string[]])[]) => string;
  readonly note: (n: number, text: string, on: string | undefined) => string;
}

/** The end of a sentence: the text without a stop of its own, then a stop. */
export const stop = (text: string): string => `${text.replace(/[.!?]$/, '')}.`;
