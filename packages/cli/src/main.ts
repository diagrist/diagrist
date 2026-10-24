#!/usr/bin/env node
import { coreEngine } from './core-engine.js';
import { crashText } from './crash.js';
import { nodeIo } from './node-io.js';
import { nodeWatcher } from './node-watcher.js';
import { PLUGINS } from './plugins.js';
import { pngRaster } from './png-raster.js';
import { run } from './run.js';

/** The diagram kinds this build of the CLI can draw. */
const engine = coreEngine(PLUGINS);

/** resvg and its 2.5 MB WebAssembly module are imported at the first PNG, so `fmt` and `check` stay fast. */
const raster = pngRaster(async () => {
  const { loadBundledFonts, loadPngRenderer } = await import('@diagrist/export-png/node');
  const [toPng, fonts] = await Promise.all([loadPngRenderer(), loadBundledFonts()]);
  return { toPng, fonts };
});

try {
  process.exitCode = await run(process.argv.slice(2), { io: nodeIo(), engine, raster, watcher: nodeWatcher() });
} catch (error) {
  process.stderr.write(`${crashText(error)}\n`);
  process.exitCode = 2;
}
