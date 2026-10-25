/** A place in the source. Line and column are 1-based; `length` counts characters. */
export interface Span {
  readonly line: number;
  readonly column: number;
  readonly length: number;
  /** The file the place is in, when it is not the file being compiled but one it reached through `use`. */
  readonly file?: string;
}

/** A span from 1-based line and column over `length` characters. */
export function span(line: number, column: number, length: number): Span {
  return { line, column, length };
}
