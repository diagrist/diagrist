/** How a value is drawn in its cell: its id as a letter, or a full or half disc. */
export type Mark = 'letter' | 'full' | 'half';

/** How often a value must appear: `one` exactly once, `some` at least once. */
export type Count = 'one' | 'some';

/** Which lines must hold at least one value: the rows, the columns, both, or none. */
export type Cover = 'rows' | 'cols' | 'both' | 'none';

/** One value of a scale, how it is drawn, and how often it must appear per row and per column. */
export interface ScaleValue {
  readonly id: string;
  readonly mark: Mark;
  readonly row?: Count;
  readonly col?: Count;
}

/** A scale of the plugin: its values in order, whether a cell may hold several, and what it covers by default. */
export interface Scale {
  readonly name: ScaleName;
  readonly values: readonly ScaleValue[];
  readonly several: boolean;
  readonly cover: Cover;
}

/** The names of the scales a matrix may name with `scale=`. */
export const SCALE_NAMES = ['raci', 'crud', 'cover'] as const;

/** The scale a header names, such as `raci`; each has an entry in `SCALES`. */
export type ScaleName = (typeof SCALE_NAMES)[number];

const letter = (id: string, counts: Partial<Pick<ScaleValue, 'row' | 'col'>> = {}): ScaleValue => ({
  id,
  mark: 'letter',
  ...counts,
});

/**
 * The scales of the plugin. `raci` asks every row for exactly one A and at least one R; `crud` asks every column for
 * at least one C and one R, so every object is created and read somewhere; `cover` has one mark per cell and asks
 * every row and every column for one.
 */
export const SCALES: Readonly<Record<ScaleName, Scale>> = {
  raci: {
    name: 'raci',
    values: [letter('R', { row: 'some' }), letter('A', { row: 'one' }), letter('C'), letter('I')],
    several: true,
    cover: 'none',
  },
  crud: {
    name: 'crud',
    values: [letter('C', { col: 'some' }), letter('R', { col: 'some' }), letter('U'), letter('D')],
    several: true,
    cover: 'none',
  },
  cover: {
    name: 'cover',
    values: [
      { id: 'full', mark: 'full' },
      { id: 'part', mark: 'half' },
    ],
    several: false,
    cover: 'both',
  },
};
