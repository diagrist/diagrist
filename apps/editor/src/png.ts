import { pngRenderer } from '@diagrist/export-png';
import wasmUrl from '@resvg/resvg-wasm/index_bg.wasm?url';
import interRegular from '../../../packages/core/fonts/Inter-Regular.ttf?url';
import interSemiBold from '../../../packages/core/fonts/Inter-SemiBold.ttf?url';
import monoBold from '../../../packages/core/fonts/JetBrainsMono-Bold.ttf?url';
import monoBoldItalic from '../../../packages/core/fonts/JetBrainsMono-BoldItalic.ttf?url';
import monoItalic from '../../../packages/core/fonts/JetBrainsMono-Italic.ttf?url';
import monoRegular from '../../../packages/core/fonts/JetBrainsMono-Regular.ttf?url';

/**
 * PNG in the browser with resvg (WebAssembly) and the same fonts as the CLI, so the bytes match `dgr build --png`.
 * Loaded only when someone asks for a PNG: the module and the fonts come from this site, the SVG never leaves.
 */
const FONT_URLS = [monoRegular, monoBold, monoItalic, monoBoldItalic, interRegular, interSemiBold];

async function bytes(url: string): Promise<Uint8Array> {
  return new Uint8Array(await (await fetch(url)).arrayBuffer());
}

/** Rasterises an SVG at `scale` pixels per unit; throws with resvg's explanation when it cannot. */
export async function svgToPng(svg: string, scale: number): Promise<Blob> {
  const [toPng, ...files] = await Promise.all([bytes(wasmUrl).then(pngRenderer), ...FONT_URLS.map(bytes)]);
  const result = toPng(svg, { scale, fonts: { family: 'JetBrains Mono', files } });
  if ('problem' in result) throw new Error(`${result.problem}: ${result.detail}`);
  return new Blob([result.png as BlobPart], { type: 'image/png' });
}
