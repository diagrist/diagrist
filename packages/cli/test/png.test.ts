import { describe, expect, it } from 'vitest';
import type { Raster } from '../src/index.js';
import { fakeEngine, LOGIN } from './support/fake-engine.js';
import { fakePng, fakeRaster } from './support/fake-raster.js';
import { call, callJson } from './support/memory-io.js';

const engine = fakeEngine();
const files = { 'diagrams/login.dgr': LOGIN };
const WRONG_TARGET = LOGIN.replace('-> api', '-> apx');

/** A raster that counts its calls, to see whether a command asked for a picture at all. */
function countingRaster(): Raster & { calls: () => number } {
  const inner = fakeRaster();
  let calls = 0;
  return {
    png: (svg, options) => {
      calls++;
      return inner.png(svg, options);
    },
    calls: () => calls,
  };
}

describe('dgr build --png', () => {
  it('writes the PNG of the SVG beside it, at twice its size by default', async () => {
    const result = await call(['build', 'diagrams/login.dgr', '--png'], { files, engine });
    expect(result).toMatchObject({ exitCode: 0, stderr: '' });
    expect(result.stdout).toBe('wrote diagrams/login.svg\nwrote diagrams/login.png\n');
    expect(result.files.get('diagrams/login.svg')).toBe('<svg>Login</svg>');
    expect(fakePng(result.files.get('diagrams/login.png'))).toBe('png 2 <svg>Login</svg>');
  });

  it('follows -o with the same name and passes --scale on', async () => {
    const result = await call(['build', 'diagrams/login.dgr', '-o', 'site/x.svg', '--png', '--scale', '1.5'], {
      files,
      engine,
    });
    expect([...result.files.keys()]).toEqual(['diagrams/login.dgr', 'site/x.svg', 'site/x.png']);
    expect(fakePng(result.files.get('site/x.png'))).toBe('png 1.5 <svg>Login</svg>');
    const bare = await call(['build', 'diagrams/login.dgr', '-o', 'site/x', '--png', '--scale=0.25'], { files });
    expect(fakePng(bare.files.get('site/x.png'))).toBe('png 0.25 <svg>Login</svg>');
  });

  it('reports both files with --json, and no PNG without --png', async () => {
    const both = await callJson(['build', 'diagrams/login.dgr', '--png'], { files, engine });
    expect(both.json).toMatchObject({ ok: true, output: 'diagrams/login.svg', png: 'diagrams/login.png' });
    const svgOnly = await callJson(['build', 'diagrams/login.dgr'], { files, engine });
    expect(svgOnly.json).toMatchObject({ ok: true, output: 'diagrams/login.svg', png: null });
  });

  it('asks for no picture without --png or when the diagram has an error', async () => {
    const raster = countingRaster();
    await call(['build', 'diagrams/login.dgr'], { files, engine, raster });
    const failed = await callJson(['build', 'a.dgr', '--png'], { files: { 'a.dgr': WRONG_TARGET }, engine, raster });
    expect(raster.calls()).toBe(0);
    expect(failed).toMatchObject({ exitCode: 1, json: { output: null, png: null } });
  });

  it.each(['0', '0.2', '9', 'two', '-1', ''])('refuses --scale=%s with the range and an example', async (scale) => {
    const result = await call(['build', 'diagrams/login.dgr', '--png', `--scale=${scale}`], { files, engine });
    expect(result).toMatchObject({ exitCode: 2, stdout: '' });
    expect(result.stderr).toBe(
      `\`--scale ${scale}\` is not a factor from 0.25 to 8; 2 doubles width and height. Example: \`dgr build diagrams/order.dgr --png --scale 3\`\n`,
    );
    expect([...result.files.keys()]).toEqual(['diagrams/login.dgr']);
  });

  it('refuses --scale without --png instead of ignoring it', async () => {
    const result = await callJson(['build', 'diagrams/login.dgr', '--scale', '3'], { files, engine });
    expect(result).toMatchObject({ exitCode: 2, json: { ok: false, error: { code: 'C014' } } });
    expect(JSON.stringify(result.json)).toContain('needs `--png`');
  });

  it('writes nothing when the renderer cannot draw the SVG, and says how to get the SVG alone', async () => {
    const raster = fakeRaster({ problem: 'invalid-svg', detail: 'SVG data parsing failed' });
    const result = await call(['build', 'diagrams/login.dgr', '--png'], { files, engine, raster });
    expect(result).toMatchObject({ exitCode: 2, stdout: '' });
    expect(result.stderr).toBe(
      'Cannot render `diagrams/login.dgr` as PNG (invalid-svg: SVG data parsing failed), so nothing was written. Without `--png` the SVG is still built: `dgr build diagrams/login.dgr`\n',
    );
    expect([...result.files.keys()]).toEqual(['diagrams/login.dgr']);
    const german = await callJson(['build', 'diagrams/login.dgr', '--png', '--locale', 'de'], { files, raster });
    expect(german.json.error).toEqual({ code: 'C015', message: expect.stringContaining('nicht als PNG zeichnen') });
  });

  it('reports a PNG that cannot be written like any unwritable file', async () => {
    const result = await callJson(['build', 'diagrams/login.dgr', '-o', 'readonly/x.svg', '--png'], { files });
    expect(result.json.error).toMatchObject({ code: 'C009', message: expect.stringContaining('readonly/x.svg') });
  });
});
