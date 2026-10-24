import { type Problem, problem } from '../messages.js';
import type { Raster } from '../raster.js';

/** Range and default of `build --scale`: below a quarter text is unreadable, above 8 a picture takes seconds and megabytes. */
export const SCALE = { min: 0.25, max: 8, standard: 2 } as const;

/** The example that messages about `--scale` show, also listed in the table of `build`. */
export const SCALED_EXAMPLE = 'dgr build diagrams/order.dgr --png --scale 3';

/**
 * The scale of the PNG that `build` writes: `undefined` without `--png`, the default with `--png` alone, or the
 * refusal of a scale that is no number in range or comes without `--png`.
 */
export function pngScale(png: boolean | undefined, scale: string | undefined): number | undefined | Problem {
  if (png !== true) return scale === undefined ? undefined : problem('scaleWithoutPng', { example: SCALED_EXAMPLE });
  if (scale === undefined) return SCALE.standard;
  const factor = Number(scale);
  if (factor >= SCALE.min && factor <= SCALE.max) return factor;
  const range = { min: String(SCALE.min), max: String(SCALE.max) };
  return problem('invalidScale', { found: scale, ...range, example: SCALED_EXAMPLE });
}

/** Renders the PNG of `file`'s SVG, or the refusal that names the renderer's problem and the call without `--png`. */
export async function renderPng(
  raster: Raster,
  svg: string,
  file: string,
  scale: number,
): Promise<Uint8Array | Problem> {
  const rendered = await raster.png(svg, { scale });
  if ('png' in rendered) return rendered.png;
  const { problem: found, detail } = rendered;
  return problem('unrenderable', { file, problem: found, detail, example: `dgr build ${file}` });
}

/** `site/order.svg` becomes `site/order.png`; a path without `.svg` gets `.png` appended. */
export function pngBeside(svg: string): string {
  return `${svg.replace(/\.svg$/, '')}.png`;
}
