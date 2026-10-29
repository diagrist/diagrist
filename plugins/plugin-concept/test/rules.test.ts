import { checkPlugin, formatMessage } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { conceptPlugin } from '../src/index.js';
import { codes, matrix, plugins } from './compile.js';

const COLS = ['col kunde "Kunde"', 'col station "Stationsteam"'];

/** The first diagnostic of a matrix as an agent reads it, in English. */
const message = (header: string, ...lines: string[]): string => {
  const [first] = matrix(header, ...lines).diagnostics;
  return first === undefined ? '' : formatMessage(first, plugins);
};

describe('matrix rules', () => {
  it('pass the plugin checks: docs, examples, a message per rule in every locale', () => {
    expect(checkPlugin(conceptPlugin)).toEqual([]);
  });

  it('M100: the header names a scale', () => {
    expect(message('', ...COLS)).toBe(
      'The matrix names no scale. Name one in the header, such as `diagram matrix "Responsibilities" scale=raci`. Scales: `raci`, `crud`, `cover`.',
    );
  });

  it('L107: a cell names a declared column, a row a declared group', () => {
    expect(codes(matrix('scale=raci', ...COLS, 'row a "A"', '  kunde R', '  stadion A'))).toEqual(['L107']);
    expect(codes(matrix('scale=raci', ...COLS, 'row a "A" in nirgends', '  kunde R,A'))).toEqual(['L107']);
  });

  it('M101: a cell holds values of the scale, as the scale writes them', () => {
    expect(message('scale=raci', ...COLS, 'row a "A"', '  kunde R,A', '  station a')).toBe(
      'The cell `station` of the row `a` holds `a`, which the scale `raci` does not know. Its values: `R`, `A`, `C`, `I`.',
    );
  });

  it('M102: a value once per cell, and one value where the scale allows one', () => {
    expect(codes(matrix('scale=raci', ...COLS, 'row a "A"', '  kunde R,R,A'))).toEqual(['M102']);
    expect(message('scale=cover', ...COLS, 'row a "A"', '  kunde full,part', '  station full')).toBe(
      'The cell `kunde` of the row `a` holds `full,part`, but the scale `cover` allows one value per cell.',
    );
  });

  it('M103: a row names a column once', () => {
    expect(message('scale=raci', ...COLS, 'row a "A"', '  kunde R', '  kunde A')).toBe(
      'The row `a` names the column `kunde` again; it already does in line 5. Write all values of a cell in one line, such as `kunde R,A`.',
    );
  });

  it('M104: raci asks every row for exactly one A and at least one R', () => {
    expect(message('scale=raci', ...COLS, 'row a "Mahnung senden"', '  kunde R')).toBe(
      '"Mahnung senden" has no `A`; the scale `raci` asks for at least one per row.',
    );
    expect(message('scale=raci', ...COLS, 'row a "A"', '  kunde R,A', '  station A')).toBe(
      '"A" has 2 times `A`; the scale `raci` asks for exactly one per row.',
    );
    expect(codes(matrix('scale=raci', ...COLS, 'row a "A"', '  kunde A'))).toEqual(['M104']);
  });

  it('M105: crud asks every column for a C and an R', () => {
    const result = matrix('scale=crud', ...COLS, 'row a "A"', '  kunde C,R', '  station R');
    expect(codes(result)).toEqual(['M105']);
    expect(message('scale=crud', ...COLS, 'row a "A"', '  kunde C,R', '  station R')).toBe(
      'The column "Stationsteam" has no `C`; the scale `crud` asks for at least one per column.',
    );
  });

  it('M106: cover asks every row and every column for a mark, other scales only under cover=', () => {
    expect(codes(matrix('scale=cover', ...COLS, 'row a "A"', '  kunde full', 'row b "B"'))).toEqual(['M106', 'M106']);
    expect(codes(matrix('scale=cover cover=rows', ...COLS, 'row a "A"', '  kunde full'))).toEqual([]);
    expect(codes(matrix('scale=raci', ...COLS, 'row a "A"', '  kunde R,A'))).toEqual([]);
    expect(message('scale=raci cover=cols', ...COLS, 'row a "A"', '  kunde R,A')).toBe(
      'The column "Stationsteam" holds no value, but `cover=` asks every column for one.',
    );
  });

  it('M107: the rows of a group stand one after another', () => {
    const rows = [
      'group g "G"',
      'row a "A" in g',
      '  kunde R,A',
      'row b "B"',
      '  kunde R,A',
      'row c "C" in g',
      '  kunde R,A',
    ];
    expect(message('scale=raci', ...COLS, ...rows)).toBe(
      'The row `c` belongs to the group `g`, but stands apart from its rows, which start with `a`. Move it below the others.',
    );
  });

  it('M600 warns of a matrix too wide for a page, and the picture is still drawn', () => {
    const cols = Array.from({ length: 13 }, (_, i) => `col c${i} "C${i}"`);
    const result = matrix('scale=raci', ...cols, 'row a "A"', '  c0 R,A');
    expect(codes(result)).toEqual(['M600']);
    expect(result.svg).toBeDefined();
  });
});
