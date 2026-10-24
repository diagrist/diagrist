import { beforeAll, describe, expect, it } from 'vitest';
import type { PngFonts, PngResult, ToPng } from '../src/index.js';
import { loadBundledFonts, loadPngRenderer } from '../src/node.js';
import { decodePng, differing, inkInRows, kernelSvg, pixel } from './picture.js';

let toPng: ToPng;
let fonts: PngFonts;

beforeAll(async () => {
  [toPng, fonts] = await Promise.all([loadPngRenderer(), loadBundledFonts()]);
});

function png(result: PngResult): Uint8Array {
  if (!('png' in result)) throw new Error(`expected a picture, got ${result.problem}: ${result.detail}`);
  return result.png;
}

describe('toPng', () => {
  it.each([
    [undefined, 200, 60],
    [1, 200, 60],
    [2, 400, 120],
    [1.5, 300, 90],
  ])('encodes the SVG size times scale %s', (scale, width, height) => {
    const result = toPng(kernelSvg(), scale === undefined ? { fonts } : { scale, fonts });
    const picture = decodePng(png(result));
    expect([picture.width, picture.height]).toEqual([width, height]);
    expect(result).toMatchObject({ width, height });
  });

  it('gives the same bytes twice, also from a second renderer', async () => {
    const first = png(toPng(kernelSvg(), { scale: 2, fonts }));
    const second = await loadPngRenderer();
    expect(png(second(kernelSvg(), { scale: 2, fonts }))).toEqual(first);
  });

  it('sets text only with the fonts passed in, regular and bold from their own files', () => {
    const picture = decodePng(png(toPng(kernelSvg(), { fonts })));
    const [regular, bold] = [inkInRows(picture, 0, 30), inkInRows(picture, 30, 60)];
    expect(regular).toBeGreaterThan(50);
    expect(bold).toBeGreaterThan(regular);

    const withoutFiles = decodePng(png(toPng(kernelSvg(), { fonts: { ...fonts, files: [] } })));
    expect(inkInRows(withoutFiles, 0, 60)).toBe(0);
    const regularOnly = decodePng(png(toPng(kernelSvg(), { fonts: { ...fonts, files: fonts.files.slice(0, 1) } })));
    expect(inkInRows(regularOnly, 30, 60)).toBe(regular);
  });

  it('sets italic text in the italic faces, regular and bold, which resvg would otherwise draw upright', () => {
    const upright = decodePng(png(toPng(kernelSvg(), { fonts })));
    const italic = decodePng(png(toPng(kernelSvg({ italic: true }), { fonts })));
    const rows = [
      [0, 30],
      [30, 60],
    ] as const;
    for (const [from, to] of rows) expect(differing(italic, upright, from, to)).toBeGreaterThan(100);

    const uprightOnly = { ...fonts, files: fonts.files.slice(0, 2) };
    const withoutItalics = decodePng(png(toPng(kernelSvg({ italic: true }), { fonts: uprightOnly })));
    expect(differing(withoutItalics, upright, 0, 60)).toBe(0);
  });

  it('keeps the background of the SVG: the canvas colour, or transparent when the SVG has none', () => {
    expect(pixel(decodePng(png(toPng(kernelSvg(), { fonts }))), 0, 0)).toEqual([250, 250, 250, 255]);
    expect(pixel(decodePng(png(toPng(kernelSvg({ inline: true }), { fonts }))), 0, 0)[3]).toBe(0);
  });

  it.each([
    ['text that is no SVG', 'Hamburg'],
    ['a document cut short', '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect'],
    ['an SVG without size', '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0"></svg>'],
  ])('reports %s as invalid-svg instead of throwing', (_, svg) => {
    const result = toPng(svg, { fonts });
    expect(result).toMatchObject({ problem: 'invalid-svg' });
    expect('detail' in result && result.detail.length).toBeGreaterThan(0);
  });

  it.each([0, -2, Number.NaN, Number.POSITIVE_INFINITY])('reports scale %s as invalid-scale', (scale) => {
    expect(toPng(kernelSvg(), { scale, fonts })).toMatchObject({ problem: 'invalid-scale' });
  });

  it('still renders the same bytes after a failed call', () => {
    const before = png(toPng(kernelSvg(), { fonts }));
    toPng('<svg', { fonts });
    toPng(kernelSvg(), { scale: 0, fonts });
    expect(png(toPng(kernelSvg(), { fonts }))).toEqual(before);
  });
});
