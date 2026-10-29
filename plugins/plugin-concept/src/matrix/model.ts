import type { KindReading, Span } from '@diagrist/lang';
import type { MatrixStatement } from './grammar/spec.js';
import { type Cover, SCALES, type Scale, type ScaleName } from './scales.js';

type Of<K extends MatrixStatement['keyword']> = Extract<MatrixStatement, { keyword: K }>;

/** A column or a group: id, the text it shows, and where it is declared. */
export interface Head {
  readonly id: string;
  readonly label: string;
  readonly span: Span;
}

/** The values of one cell in the order written, and the line they stand in. */
export interface Cell {
  readonly col: string;
  readonly values: readonly string[];
  readonly span: Span;
}

/** A row with its group and its cells. */
export interface Row extends Head {
  readonly group?: string;
  readonly cells: readonly Cell[];
}

/** A note, numbered in source order, and the row or column it is about. */
export interface Note {
  readonly n: number;
  readonly text: string;
  readonly on?: string;
  readonly span: Span;
}

/** A matrix as rules, layout and description see it. */
export interface MatrixModel {
  readonly title: string;
  readonly subtitle?: string;
  /** The scale the header names; absent when it names none, which a rule reports. */
  readonly scale?: Scale;
  /** The lines that need a value: the header's `cover=`, else the scale's default. */
  readonly cover: Cover;
  readonly cols: readonly Head[];
  readonly groups: readonly Head[];
  readonly rows: readonly Row[];
  readonly notes: readonly Note[];
  /** The header line, which findings about the whole matrix point at. */
  readonly span: Span;
}

const of = <K extends MatrixStatement['keyword']>(reading: KindReading<MatrixStatement>, keyword: K): Of<K>[] =>
  reading.statements.filter((s): s is Of<K> => s.keyword === keyword);

/** Reads columns, groups, rows with their cells and notes; the scale from the header's name. */
export function matrixModel(reading: KindReading<MatrixStatement>): MatrixModel {
  const attributes = reading.header?.attributes ?? {};
  const name = attributes.scale as ScaleName | undefined;
  const scale = name === undefined ? undefined : SCALES[name];
  const cover = (attributes.cover as Cover | undefined) ?? scale?.cover ?? 'none';
  const subtitle = attributes.subtitle;
  const head = ({ id, label, span }: Of<'col' | 'group'>): Head => ({ id, label, span });
  const rows = of(reading, 'row').map(
    (r): Row => ({
      id: r.id,
      label: r.label,
      span: r.span,
      ...(r.clauses.in === undefined ? {} : { group: r.clauses.in }),
      cells: r.lines.map(({ col, values, span }) => ({ col, values, span })),
    }),
  );
  const notes = of(reading, 'note').map(
    (s, i): Note => ({ n: i + 1, text: s.text, span: s.span, ...(s.clauses.on ? { on: s.clauses.on } : {}) }),
  );
  return {
    title: reading.header?.title ?? '',
    ...(typeof subtitle === 'string' ? { subtitle } : {}),
    ...(scale === undefined ? {} : { scale }),
    cover,
    cols: of(reading, 'col').map(head),
    groups: of(reading, 'group').map(head),
    rows,
    notes,
    span: { line: reading.header?.line ?? 1, column: 1, length: 'diagram'.length },
  };
}
