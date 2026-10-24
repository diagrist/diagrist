import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compareGolden } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { FONT_STACKS, textRule, textWidth } from '../src/index.js';
import { packedSource } from './packed.js';
import { type Advances, readAdvances } from './ttf.js';

const at = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/** The advances of one of the bundled files, such as `JetBrainsMono-Bold` for `fonts/JetBrainsMono-Bold.ttf`. */
const file = (name: string): Advances => readAdvances(readFileSync(at(`../fonts/${name}.ttf`)));
const face = (name: 'Regular' | 'Bold' | 'Italic' | 'BoldItalic'): Advances => file(`JetBrainsMono-${name}`);

/** The packed table of an Inter face, regenerated from its file (ADR 0022). */
const inter = (weight: 'Regular' | 'SemiBold', name: string): string =>
  packedSource(
    name,
    [
      `Advances of Inter 4.1 ${weight} (SIL Open Font License 1.1, see \`fonts/OFL-Inter.txt\`) in font units, packed`,
      `as \`PackedFace\` describes. Generated from \`fonts/Inter-${weight}.ttf\` by \`test/font-metrics.test.ts\`; run it`,
      'with `UPDATE_GOLDEN=1` instead of editing this file.',
    ],
    file(`Inter-${weight}`),
  );

/** The packed table of a Geist face, regenerated from its file like Inter's. */
const geist = (font: 'Geist-Regular' | 'Geist-SemiBold' | 'GeistMono-Regular', name: string): string =>
  packedSource(
    name,
    [
      `Advances of ${font.replace('-', ' ').replace('Mono', ' Mono')} 1.8.2 (SIL Open Font License 1.1, see \`fonts/OFL-Geist.txt\`) in`,
      `font units, packed as \`PackedFace\` describes. Generated from \`fonts/${font}.ttf\` by`,
      '`test/font-metrics.test.ts`; run it with `UPDATE_GOLDEN=1` instead of editing this file.',
    ],
    file(font),
  );

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
    ['Regular', 'inter-regular', 'INTER_REGULAR'],
    ['SemiBold', 'inter-semibold', 'INTER_SEMIBOLD'],
  ] as const)('of Inter %s match the bundled file', (weight, path, name) => {
    expect(compareGolden(at(`../src/${path}.ts`), inter(weight, name)).status).not.toBe('mismatch');
  });

  it.each([
    ['Geist-Regular', 'geist-regular', 'GEIST_REGULAR'],
    ['Geist-SemiBold', 'geist-semibold', 'GEIST_SEMIBOLD'],
    ['GeistMono-Regular', 'geist-mono', 'GEIST_MONO'],
  ] as const)('of %s match the bundled file', (font, path, name) => {
    expect(compareGolden(at(`../src/${path}.ts`), geist(font, name)).status).not.toBe('mismatch');
  });

  it.each([
    ['Italic', 'Regular'],
    ['BoldItalic', 'Bold'],
  ] as const)('give %s the advances of %s, so italic text needs no table of its own', (italic, upright) => {
    const advances = (f: Advances) => ({ unitsPerEm: f.unitsPerEm, missing: f.missing, byCodePoint: f.byCodePoint });
    expect(advances(face(italic))).toEqual(advances(face(upright)));
  });
});

describe('textWidth', () => {
  it('measures each bundled typeface from its own table, JetBrains Mono when the font names none', () => {
    expect(textWidth('Hamburg', { size: 10 })).toBe(42);
    expect(textWidth('Hamburg', { size: 10, family: 'jetbrains-mono' })).toBe(42);
    expect(textWidth('Hamburg', { size: 10, family: 'inter' })).toBe(44);
    expect(textWidth('iiii', { size: 10, family: 'inter' })).toBeLessThan(
      textWidth('MMMM', { size: 10, family: 'inter' }),
    );
  });

  it('counts letter spacing after every character, as the stylesheet writes it', () => {
    const tracked = { size: 10, family: 'inter', letterSpacing: 0.5 } as const;
    expect(textWidth('ZONE', tracked)).toBe(Math.ceil(textWidth('ZONE', { size: 10, family: 'inter' }) + 2));
    expect(textRule('fill: #000;', tracked)).toBe(
      `fill: #000; font-family: ${FONT_STACKS.inter}; font-size: 10px; letter-spacing: 0.5px;`,
    );
  });
});
