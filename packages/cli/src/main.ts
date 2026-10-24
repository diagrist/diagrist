#!/usr/bin/env node
import { umlPlugin } from '@diagrist/plugin-uml';
import { coreEngine } from './core-engine.js';
import { nodeIo } from './node-io.js';
import { pngRaster } from './png-raster.js';
import { run } from './run.js';

/** The diagram kinds this build of the CLI can draw. */
const engine = coreEngine([umlPlugin]);

/** resvg and its 2.5 MB WebAssembly module are imported at the first PNG, so `fmt` and `check` stay fast. */
const raster = pngRaster(async () => {
  const { loadBundledFonts, loadPngRenderer } = await import('@diagrist/export-png/node');
  const [toPng, fonts] = await Promise.all([loadPngRenderer(), loadBundledFonts()]);
  return { toPng, fonts };
});

process.exitCode = await run(process.argv.slice(2), nodeIo(), engine, raster);
