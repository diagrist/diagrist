import { readFileSync } from 'node:fs';
import { loadBundledFonts, loadPngRenderer } from '@diagrist/export-png/node';
import { umlPlugin } from '@diagrist/plugin-uml';
import { describe, expect, it } from 'vitest';
import { coreEngine } from '../src/core-engine.js';
import { pngRaster } from '../src/png-raster.js';
import { call } from './support/memory-io.js';

const engine = coreEngine([umlPlugin]);
const files = {
  'oauth-pkce.dgr': readFileSync(
    new URL('../../../plugins/plugin-uml/examples/sequence/oauth-pkce.dgr', import.meta.url),
    'utf8',
  ),
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
    const first = await call(['build', 'oauth-pkce.dgr', '--png'], { files, engine, raster });
    expect(first).toMatchObject({ exitCode: 0, stderr: '' });
    const svg = first.files.get('oauth-pkce.svg');
    expect(svgSize(svg)).toEqual([1026, 905]);
    expect(sizeOf(first.files.get('oauth-pkce.png'))).toEqual([2052, 1810]);

    const again = await call(['build', 'oauth-pkce.dgr', '--png'], { files, engine, raster: realRaster().raster });
    expect(again.files.get('oauth-pkce.png')).toEqual(first.files.get('oauth-pkce.png'));

    const plain = await call(['build', 'oauth-pkce.dgr', '--png', '--scale', '1'], { files, engine, raster });
    expect(sizeOf(plain.files.get('oauth-pkce.png'))).toEqual(svgSize(svg));
  });

  it('loads the renderer only for the first PNG, never for fmt, check or a build without --png', async () => {
    const { raster, loads } = realRaster();
    await call(['fmt', '--check', 'oauth-pkce.dgr'], { files, engine, raster });
    await call(['check', 'oauth-pkce.dgr'], { files, engine, raster });
    await call(['build', 'oauth-pkce.dgr'], { files, engine, raster });
    expect(loads()).toBe(0);
    await call(['build', 'oauth-pkce.dgr', '--png', '--scale', '0.5'], { files, engine, raster });
    await call(['build', 'oauth-pkce.dgr', '--png', '--scale', '0.5'], { files, engine, raster });
    expect(loads()).toBe(1);
  });

  it('reports a renderer that cannot be loaded as a refusal, not a crash', async () => {
    const broken = pngRaster(() => Promise.reject(new Error('index_bg.wasm: no such file')));
    const result = await call(['build', 'oauth-pkce.dgr', '--png'], { files, engine, raster: broken });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('(unavailable: index_bg.wasm: no such file)');
    expect(result.files.has('oauth-pkce.svg')).toBe(false);
  });
});
