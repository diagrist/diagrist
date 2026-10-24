/** A place in the source. Line and column are 1-based; `length` counts characters. */
export interface Span {
  readonly line: number;
  readonly column: number;
  readonly length: number;
}

export function span(line: number, column: number, length: number): Span {
  return { line, column, length };
}
