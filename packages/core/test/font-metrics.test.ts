import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compareGolden } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { readAdvances } from './ttf.js';

const at = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/** The checked-in metrics, regenerated from the font files (ADR 0004); `UPDATE_GOLDEN=1` rewrites them. */
function generate(): string {
  const faces = (['Regular', 'Bold'] as const).map((weight) =>
    readAdvances(readFileSync(at(`../fonts/JetBrainsMono-${weight}.ttf`))),
  );
  const [regular, bold] = faces;
  if (regular === undefined || bold === undefined) throw new Error('missing font');
  const face = (name: string, f: typeof regular) => {
    const exceptions = [...f.byCodePoint].filter(([, advance]) => advance !== f.missing).sort(([a], [b]) => a - b);
    return [
      `  ${name}: {`,
      `    advance: ${f.missing},`,
      '    exceptions: [',
      ...exceptions.map(([codePoint, advance]) => `      [0x${codePoint.toString(16)}, ${advance}],`),
      '    ],',
      '  },',
    ];
  };
  return [
    '/**',
    ' * Advance widths of JetBrains Mono 2.305 (SIL Open Font License 1.1, see `fonts/OFL.txt`) in font units.',
    ' * Generated from `fonts/JetBrainsMono-Regular.ttf` and `fonts/JetBrainsMono-Bold.ttf` by',
    ' * `test/font-metrics.test.ts`; run it with `UPDATE_GOLDEN=1` instead of editing this file.',
    ' */',
    'export interface FaceMetrics {',
    '  /** Advance of every code point not listed, including those the font does not map. */',
    '  readonly advance: number;',
    '  readonly exceptions: readonly (readonly [number, number])[];',
    '}',
    '',
    '/** Units per em and advances of the regular and the bold face. */',
    'export const FONT_METRICS: {',
    '  readonly unitsPerEm: number;',
    '  readonly regular: FaceMetrics;',
    '  readonly bold: FaceMetrics;',
    '} = {',
    `  unitsPerEm: ${regular.unitsPerEm},`,
    ...face('regular', regular),
    ...face('bold', bold),
    '};',
    '',
  ].join('\n');
}

describe('font metrics', () => {
  it('match the bundled font files', () => {
    expect(compareGolden(at('../src/font-metrics.ts'), generate()).status).not.toBe('mismatch');
  });
});
