import { FONT_STACKS, type Font, textWidth } from '@diagrist/core';
import { beforeAll, describe, expect, it } from 'vitest';
import type { PngFonts, ToPng } from '../src/index.js';
import { loadBundledFonts, loadPngRenderer } from '../src/node.js';
import { decodePng, type Picture, pixel } from './picture.js';

let toPng: ToPng;
let fonts: PngFonts;

beforeAll(async () => {
  [toPng, fonts] = await Promise.all([loadPngRenderer(), loadBundledFonts()]);
});

/** Pairs Inter kerns tightly, so a renderer that kerns sets them visibly narrower than their advances. */
const TEXT = 'AVAVAV Tower Ty Wa';
const START = 10;

/** One line of Inter at `x`, anchored as given; `kerning` leaves the renderer's kerning on. */
function picture(font: Font, x: number, anchor: 'start' | 'end', kerning: boolean): Picture {
  const root = `font-family: ${FONT_STACKS[font.family ?? 'inter']};${kerning ? '' : ' font-kerning: none;'}`;
  const weight = font.weight === undefined ? '' : ` font-weight="${font.weight}"`;
  const tracking = font.letterSpacing === undefined ? '' : ` letter-spacing="${font.letterSpacing}"`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="40"><style>svg { ${root} }</style><rect width="320" height="40" fill="#fff"/><text x="${x}" y="28" font-size="${font.size}"${weight}${tracking} text-anchor="${anchor}">${TEXT}</text></svg>`;
  const result = toPng(svg, { fonts });
  if (!('png' in result)) throw new Error(result.detail);
  return decodePng(result.png);
}

/** The first column from the left with ink in it. */
function firstInk(p: Picture): number {
  for (let x = 0; x < p.width; x++) for (let y = 0; y < p.height; y++) if ((pixel(p, x, y)[0] ?? 255) < 128) return x;
  return -1;
}

/** How far the text set from its end lands from where the same text set from its start begins. */
const drift = (font: Font, kerning: boolean): number =>
  firstInk(picture(font, START + textWidth(TEXT, font), 'end', kerning)) -
  firstInk(picture(font, START, 'start', kerning));

describe('Proportional faces in the PNG', () => {
  it.each([
    ['regular', { size: 20, family: 'inter' }],
    ['semibold', { size: 20, weight: 600, family: 'inter' }],
    ['tracked small capitals', { size: 9.5, weight: 600, family: 'inter', letterSpacing: 0.7 }],
    ['Space Grotesk regular', { size: 20, family: 'space-grotesk' }],
    ['Space Grotesk medium, tracked', { size: 13, weight: 500, family: 'space-grotesk', letterSpacing: 1 }],
  ] as const)('is set as wide as the kernel measures it, %s, with kerning off', (_, font: Font) => {
    expect(Math.abs(drift(font, false))).toBeLessThanOrEqual(1);
  });

  it('would be set narrower with kerning on, which is why pictures in Inter switch it off (ADR 0022)', () => {
    expect(drift({ size: 20, family: 'inter' }, true)).toBeGreaterThan(4);
  });
});
