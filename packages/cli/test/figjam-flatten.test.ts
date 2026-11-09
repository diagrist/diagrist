import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { flattenSvg } from '@diagrist/export-figjam';
import type { PngFonts, ToPng } from '@diagrist/export-png';
import { loadBundledFonts, loadPngRenderer } from '@diagrist/export-png/node';
import { beforeAll, describe, expect, it } from 'vitest';
import { coreEngine } from '../src/core-engine.js';
import { PLUGINS } from '../src/plugins.js';
import { decodePng, differingPixels } from './support/pixels.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const engine = coreEngine(PLUGINS);

/** The SVG of the base picture of an example, compiled with every file it reads. */
function kernelSvg(example: string): string {
  const path = join(root, example);
  const source = readFileSync(path, 'utf8');
  const files: Record<string, string> = {};
  for (;;) {
    const compiled = engine.compile(source, { locale: 'en', path: example.split('/').at(-1) ?? example, files });
    const missing = compiled.needs.filter((need) => !Object.hasOwn(files, need.path));
    if (missing.length === 0) return compiled.pictures[0]?.svg ?? '';
    for (const need of missing) files[need.path] = readFileSync(join(dirname(path), need.path), 'utf8');
  }
}

let toPng: ToPng;
let fonts: PngFonts;

beforeAll(async () => {
  [toPng, fonts] = await Promise.all([loadPngRenderer(), loadBundledFonts()]);
});

function pixels(svg: string) {
  const result = toPng(svg, { fonts, scale: 1 });
  if (!('png' in result)) throw new Error(`${result.problem}: ${result.detail}`);
  return decodePng(result.png);
}

/**
 * The flattened SVG must draw what the kernel's draws, so what FigJam imports is the picture and nothing in it
 * depended on the stylesheet, the markers or `xml:space`. Both go through resvg at scale 1 and at most 0.01 % of
 * the pixels may differ by more than 24 in a channel: what is left is the anti-aliasing of the turned arrowheads.
 * One picture per way of drawing: C4 with icons and halos, UML with ellipses and markers, the paper look in Inter
 * with `font-kerning: none` and letter spacing, and code with indented lines kept by `xml:space`.
 */
describe('flattenSvg draws what the kernel drew', () => {
  it.each([
    'plugins/plugin-architecture/examples/architecture/cloud.dgr',
    'plugins/plugin-uml/examples/usecase/onlineshop.dgr',
    'plugins/plugin-architecture/examples/radverleih/komponenten-paper.dgr',
    'plugins/plugin-code/examples/ueberweisung/methode.dgr',
  ])('%s', (example) => {
    const svg = kernelSvg(example);
    const flat = flattenSvg(svg).svg;
    expect(flat).not.toMatch(/class=|<style|marker-|xml:space/);
    const before = pixels(svg);
    const after = pixels(flat);
    expect([after.width, after.height]).toEqual([before.width, before.height]);
    expect(differingPixels(before, after) / (before.width * before.height)).toBeLessThanOrEqual(0.0001);
  });
});
