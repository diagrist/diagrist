/** One finding, already phrased in the locale of the diagram, with its place in the source. */
export interface Finding {
  readonly code: string;
  readonly severity: 'error' | 'warning';
  readonly line: number;
  readonly column: number;
  readonly length: number;
  readonly message: string;
}

/** What the page asks the worker: compile this source; `id` lets the page drop answers that came too late. */
export interface Request {
  readonly id: number;
  readonly source: string;
}

/** The answer: the picture when the source has no error, and every finding. */
export interface Response {
  readonly id: number;
  readonly svg?: string;
  readonly title?: string;
  readonly findings: readonly Finding[];
}
