import { readFile } from 'node:fs/promises';
import { type PngFonts, pngRenderer, type ToPng } from './index.js';

/**
 * The fonts the kernel measures text with (`@diagrist/core/fonts`, SIL Open Font License 1.1), so the PNG sets
 * text in the same widths the layout was computed for. The italic faces set `font-style: italic`; without them
 * resvg would draw such text upright. Inter, Geist and Geist Mono set the texts of looks that name them (ADR 0022);
 * every other family falls back to JetBrains Mono.
 */
const BUNDLED = {
  family: 'JetBrains Mono',
  files: [
    'JetBrainsMono-Regular.ttf',
    'JetBrainsMono-Bold.ttf',
    'JetBrainsMono-Italic.ttf',
    'JetBrainsMono-BoldItalic.ttf',
    'Inter-Regular.ttf',
    'Inter-SemiBold.ttf',
    'Geist-Regular.ttf',
    'Geist-SemiBold.ttf',
    'GeistMono-Regular.ttf',
  ],
} as const;

/** Node host for the PNG exporter: reads resvg's WebAssembly module from disk and sets it up. */
export async function loadPngRenderer(): Promise<ToPng> {
  return pngRenderer(await readFile(new URL(import.meta.resolve('@resvg/resvg-wasm/index_bg.wasm'))));
}

/**
 * Reads the kernel's bundled fonts from disk. They sit next to the kernel's entry (`src/` in the repository,
 * `dist/` when installed), so they are found relative to wherever `@diagrist/core` resolves.
 */
export async function loadBundledFonts(): Promise<PngFonts> {
  const directory = new URL('../fonts/', import.meta.resolve('@diagrist/core'));
  const files = await Promise.all(BUNDLED.files.map((name) => readFile(new URL(name, directory))));
  return { family: BUNDLED.family, files };
}
