import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compareGolden } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { type Advances, readAdvances } from './ttf.js';

const at = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/** The advances of one of the bundled faces, such as `Bold` for `fonts/JetBrainsMono-Bold.ttf`. */
const face = (name: 'Regular' | 'Bold' | 'Italic' | 'BoldItalic'): Advances =>
  readAdvances(readFileSync(at(`../fonts/JetBrainsMono-${name}.ttf`)));

/** The checked-in metrics, regenerated from the font files (ADR 0004); `UPDATE_GOLDEN=1` rewrites them. */
function generate(): string {
  const [regular, bold] = [face('Regular'), face('Bold')];
  const table = (name: string, f: Advances) => {
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
    ' * `test/font-metrics.test.ts`; run it with `UPDATE_GOLDEN=1` instead of editing this file. The italic faces',
    ' * have the advances of their upright ones, which the same test checks, so italic text is measured with these.',
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
    ...table('regular', regular),
    ...table('bold', bold),
    '};',
    '',
  ].join('\n');
}

describe('font metrics', () => {
  it('match the bundled font files', () => {
    expect(compareGolden(at('../src/font-metrics.ts'), generate()).status).not.toBe('mismatch');
  });

  it.each([
    ['Italic', 'Regular'],
    ['BoldItalic', 'Bold'],
  ] as const)('give %s the advances of %s, so italic text needs no table of its own', (italic, upright) => {
    const advances = (f: Advances) => ({ unitsPerEm: f.unitsPerEm, missing: f.missing, byCodePoint: f.byCodePoint });
    expect(advances(face(italic))).toEqual(advances(face(upright)));
  });
});
