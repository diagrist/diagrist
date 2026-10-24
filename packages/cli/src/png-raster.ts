import type { PngFonts, ToPng } from '@diagrist/export-png';
import type { Raster } from './raster.js';

/** What the PNG exporter needs before its first picture: the set-up renderer and the fonts it sets text with. */
export interface PngExporter {
  readonly toPng: ToPng;
  readonly fonts: PngFonts;
}

/**
 * The `Raster` port filled by `@diagrist/export-png` (ADR 0009). `load` runs at the first PNG and only then, so a
 * call that draws none never reads the WebAssembly module; later PNGs reuse what it loaded. A loader that fails is
 * reported like a picture that cannot be drawn, as data with the reason.
 */
export function pngRaster(load: () => Promise<PngExporter>): Raster {
  let loading: Promise<PngExporter> | undefined;
  return {
    async png(svg, { scale }) {
      loading ??= load();
      let exporter: PngExporter;
      try {
        exporter = await loading;
      } catch (error) {
        return { problem: 'unavailable', detail: error instanceof Error ? error.message : String(error) };
      }
      const result = exporter.toPng(svg, { scale, fonts: exporter.fonts });
      return 'png' in result ? { png: result.png } : { problem: result.problem, detail: result.detail };
    },
  };
}
