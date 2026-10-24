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

/** A proportional face bundled as a packed table (ADR 0022): its release, its licence file and the weight's name. */
const PACKED = {
  inter: { name: 'Inter 4.1', file: 'Inter', licence: 'OFL-Inter.txt' },
  'space-grotesk': { name: 'Space Grotesk 2.0.0', file: 'SpaceGrotesk', licence: 'OFL-SpaceGrotesk.txt' },
} as const;

/** The packed table of a proportional face, regenerated from its file. */
const packed = (family: keyof typeof PACKED, weight: string, name: string): string => {
  const f = PACKED[family];
  return packedSource(
    name,
    [
      `Advances of ${f.name} ${weight} (SIL Open Font License 1.1, see \`fonts/${f.licence}\`) in font units, packed`,
      `as \`PackedFace\` describes. Generated from \`fonts/${f.file}-${weight}.ttf\` by \`test/font-metrics.test.ts\`; run it`,
      'with `UPDATE_GOLDEN=1` instead of editing this file.',
    ],
    file(`${f.file}-${weight}`),
  );
};

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
    ['inter', 'Regular', 'inter-regular', 'INTER_REGULAR'],
    ['inter', 'SemiBold', 'inter-semibold', 'INTER_SEMIBOLD'],
    ['space-grotesk', 'Regular', 'space-grotesk-regular', 'SPACE_GROTESK_REGULAR'],
    ['space-grotesk', 'Medium', 'space-grotesk-medium', 'SPACE_GROTESK_MEDIUM'],
  ] as const)('of %s %s match the bundled file', (family, weight, path, name) => {
    expect(compareGolden(at(`../src/${path}.ts`), packed(family, weight, name)).status).not.toBe('mismatch');
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

  it('sets Space Grotesk in its Medium face from weight 500, where the other faces still set regular', () => {
    const at = (weight: number) => textWidth('RADVERLEIH KONTO', { size: 13, weight, family: 'space-grotesk' });
    expect(at(500)).toBeGreaterThan(at(400));
    expect(textWidth('RADVERLEIH', { size: 13, weight: 500, family: 'inter' })).toBe(
      textWidth('RADVERLEIH', { size: 13, family: 'inter' }),
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
