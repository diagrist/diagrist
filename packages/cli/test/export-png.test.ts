import { loadBundledFonts, loadPngRenderer } from '@diagrist/export-png/node';
import { umlPlugin } from '@diagrist/plugin-uml';
import { describe, expect, it } from 'vitest';
import { coreEngine } from '../src/core-engine.js';
import { pngRaster } from '../src/png-raster.js';
import { call } from './support/memory-io.js';

const engine = coreEngine([umlPlugin]);
/** A picture as small as a sequence diagram gets, since resvg's time grows with its pixels. */
const files = {
  'ping.dgr': 'diagram sequence "Ping"\nparticipant a "A"\nparticipant b "B"\nmsg a ~> b "ping"\n',
};

/** The real exporter behind the port, loaded the way `main.ts` loads it, counting how often it was loaded. */
function realRaster(): { raster: ReturnType<typeof pngRaster>; loads: () => number } {
  let loads = 0;
  const raster = pngRaster(async () => {
    loads++;
    const [toPng, fonts] = await Promise.all([loadPngRenderer(), loadBundledFonts()]);
    return { toPng, fonts };
  });
  return { raster, loads: () => loads };
}

/** Width and height as encoded in the PNG's header chunk, not as any API reports them. */
function sizeOf(png: string | Uint8Array | undefined): [number, number] {
  if (!(png instanceof Uint8Array)) throw new Error('expected PNG bytes');
  const header = new DataView(png.buffer, png.byteOffset, png.byteLength);
  expect(new TextDecoder().decode(png.subarray(12, 16))).toBe('IHDR');
  return [header.getUint32(16), header.getUint32(20)];
}

/** Width and height the SVG declares. */
function svgSize(svg: string | Uint8Array | undefined): [number, number] {
  const found = /^<svg [^>]*width="(\d+)" height="(\d+)"/.exec(String(svg));
  return [Number(found?.[1]), Number(found?.[2])];
}

describe('dgr build --png with the real kernel, the UML plugin and resvg', () => {
  it('writes a PNG of the SVG at the requested scale, the same bytes on every call', async () => {
    const { raster } = realRaster();
    const first = await call(['build', 'ping.dgr', '--png'], { files, engine, raster });
    expect(first).toMatchObject({ exitCode: 0, stderr: '' });
    const svg = first.files.get('ping.svg');
    expect(svgSize(svg)).toEqual([308, 217]);
    expect(sizeOf(first.files.get('ping.png'))).toEqual([616, 434]);

    const plain = await call(['build', 'ping.dgr', '--png', '--scale', '1'], { files, engine, raster });
    expect(sizeOf(plain.files.get('ping.png'))).toEqual(svgSize(svg));
    const again = await call(['build', 'ping.dgr', '--png', '--scale', '1'], {
      files,
      engine,
      raster: realRaster().raster,
    });
    expect(again.files.get('ping.png')).toEqual(plain.files.get('ping.png'));
  });

  it('loads the renderer only for the first PNG, never for fmt, check or a build without --png', async () => {
    const { raster, loads } = realRaster();
    await call(['fmt', '--check', 'ping.dgr'], { files, engine, raster });
    await call(['check', 'ping.dgr'], { files, engine, raster });
    await call(['build', 'ping.dgr'], { files, engine, raster });
    expect(loads()).toBe(0);
    await call(['build', 'ping.dgr', '--png', '--scale', '0.5'], { files, engine, raster });
    await call(['build', 'ping.dgr', '--png', '--scale', '0.5'], { files, engine, raster });
    expect(loads()).toBe(1);
  });

  it('reports a renderer that cannot be loaded as a refusal, not a crash', async () => {
    const broken = pngRaster(() => Promise.reject(new Error('index_bg.wasm: no such file')));
    const result = await call(['build', 'ping.dgr', '--png'], { files, engine, raster: broken });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('(unavailable: index_bg.wasm: no such file)');
    expect(result.files.has('ping.svg')).toBe(false);
  });
});
