import { initWasm, Resvg } from '@resvg/resvg-wasm';

/**
 * Fonts as data, so the exporter reads no files and finds no system fonts: the same SVG gives the same pixels on
 * every machine. Every font family and generic family in the SVG falls back to `family`.
 */
export interface PngFonts {
  /** Family name inside the font files, e.g. `JetBrains Mono`. */
  readonly family: string;
  /** Raw TrueType or OpenType files, typically one per weight. */
  readonly files: readonly Uint8Array[];
}

/** How `toPng` rasterises. */
export interface PngOptions {
  /** Pixels per SVG unit: 2 doubles width and height. Default 1. Must be a positive finite number. */
  readonly scale?: number;
  readonly fonts: PngFonts;
}

/** Why no picture came out: the SVG could not be read, or the scale is not a positive finite number. */
export type PngProblem = 'invalid-svg' | 'invalid-scale';

/** The encoded picture with its size in pixels, or the problem with resvg's own explanation. */
export type PngResult =
  | { readonly png: Uint8Array; readonly width: number; readonly height: number }
  | { readonly problem: PngProblem; readonly detail: string };

/** Rasterises an SVG document. Same SVG, options and fonts give the same bytes. */
export type ToPng = (svg: string, options: PngOptions) => PngResult;

/**
 * resvg keeps one module instance per JavaScript realm and refuses to be set up twice, so the first set-up is
 * shared by every renderer.
 */
let ready: Promise<void> | undefined;

/**
 * Sets up resvg from the bytes of `@resvg/resvg-wasm/index_bg.wasm` and returns `toPng`. Hosts pass the bytes
 * because only they know where the file lives: Node reads it from disk (`@diagrist/export-png/node`), a browser
 * fetches it. Background, sizes and colours come from the SVG; areas the SVG leaves empty stay transparent.
 */
export async function pngRenderer(wasm: Uint8Array): Promise<ToPng> {
  ready ??= initWasm(wasm);
  await ready;
  return toPng;
}

function toPng(svg: string, { scale = 1, fonts }: PngOptions): PngResult {
  if (!Number.isFinite(scale) || scale <= 0) return { problem: 'invalid-scale', detail: `scale ${scale}` };
  const family = fonts.family;
  let renderer: InstanceType<typeof Resvg>;
  try {
    renderer = new Resvg(svg, {
      font: {
        fontBuffers: [...fonts.files],
        defaultFontFamily: family,
        monospaceFamily: family,
        sansSerifFamily: family,
        serifFamily: family,
        cursiveFamily: family,
        fantasyFamily: family,
      },
      fitTo: { mode: 'zoom', value: scale },
    });
  } catch (error) {
    return { problem: 'invalid-svg', detail: error instanceof Error ? error.message : String(error) };
  }
  try {
    const image = renderer.render();
    try {
      return { png: image.asPng(), width: image.width, height: image.height };
    } finally {
      image.free();
    }
  } finally {
    renderer.free();
  }
}
