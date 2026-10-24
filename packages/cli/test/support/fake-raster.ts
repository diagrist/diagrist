import type { Raster } from '../../src/index.js';

/**
 * A stand-in for the PNG renderer: its "PNG" is the text `png <scale> <svg>` as bytes, so tests see which SVG was
 * rendered at which scale. With `problem` it refuses every picture the way a renderer reports one it cannot draw.
 */
export function fakeRaster(problem?: { problem: string; detail: string }): Raster {
  return {
    png: async (svg, { scale }) => problem ?? { png: new TextEncoder().encode(`png ${scale} ${svg}`) },
  };
}

/** The text a PNG of the fake raster stands for, or `undefined` for a file that is missing or no such PNG. */
export function fakePng(content: string | Uint8Array | undefined): string | undefined {
  return content instanceof Uint8Array ? new TextDecoder().decode(content) : undefined;
}
