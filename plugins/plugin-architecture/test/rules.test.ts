import { formatMessage } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { codes, diagram, plugins } from './compile.js';

const A = 'system a1 "A" at a/main';
const B = 'system b1 "B" at b/main';

describe('rules of C4 diagrams', () => {
  it.each([
    ['A001', [A, 'note "replaced soon"']],
    ['A007', [A, 'group g "G"']],
    ['A007', [A, 'group g "G" own shared']],
    ['A008', ['system s "S"']],
    ['A103', ['system s "S" at x/main']],
    ['A103', ['system s "S" at a/nowhere']],
    ['A105', [A, 'edge a1 -> a1 "calls"']],
    ['A106', ['grid cols a,a', 'grid rows main', A]],
    ['A107', ['group g "G" own', 'system s "S" at a/main in g', 'edge s -> g "calls"']],
    ['A109', [A, 'system s "S" at b/main span=c']],
    ['A109', [A, 'layer main "Main"']],
    ['A109', [A, 'group g1 "G1" own in g2', 'group g2 "G2" own in g1', 'system s "S" at b/main in g1']],
  ] as const)('%s reports %j', (code, lines) => {
    const result = diagram('context', ...lines);
    expect(codes(result)).toContain(code);
    expect(result.svg).toBeUndefined();
  });

  it.each([
    ['A710', [A, B, 'edge a1 -> b1']],
    ['A801', [A, 'adr E1 "Q?" = "Yes"']],
  ] as const)('%s warns about %j but draws the picture', (code, lines) => {
    const result = diagram('context', ...lines);
    expect(codes(result)).toEqual([code]);
    expect(result.svg).toBeDefined();
  });

  it('passes a diagram that respects all of them', () => {
    const ok = diagram(
      'context',
      'group g "G" own',
      A,
      `${B} in g mark=E1`,
      'edge a1 -> b1 "calls" via=HTTPS',
      'adr E1 "Q?" = "Yes"',
    );
    expect(codes(ok)).toEqual([]);
  });

  it('lets an adaptive grid span, slot, bundle and name layers', () => {
    const result = diagram(
      'container layout=adaptive',
      'grid cols a,b,c',
      'grid rows top,main',
      'system s "S" at a/top span=c',
      'system t "T" at a/main slot=1/2',
      'system u "U" at a/main slot=2/2',
      'edge s -> t "x" bundle=down',
      'edge s -> u "y" bundle=down',
      'layer top "Top"',
    ).diagnostics;
    expect(result.filter((d) => d.severity === 'error')).toEqual([]);
    expect(codes(diagram('container', 'system s "S" at a/top span=c'))).toContain('A109');
  });

  it('phrases each finding in English and German, naming what is allowed', () => {
    const [found] = diagram('context', 'system s "S" at x/main').diagnostics;
    if (!found) throw new Error('no finding');
    expect(formatMessage(found, plugins, 'en')).toBe(
      'The column `x` of `s` is not in the grid. Columns: `a`, `b`, `c`.',
    );
    expect(formatMessage(found, plugins, 'de')).toBe(
      'Die Spalte `x` von `s` steht nicht im Raster. Spalten: `a`, `b`, `c`.',
    );
  });
});
