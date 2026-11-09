import { describe, expect, it } from 'vitest';
import { LOGIN } from './support/fake-engine.js';
import { fakePng } from './support/fake-raster.js';
import { figjamEngine, kernelSvg } from './support/figjam-engine.js';
import { call, callJson } from './support/memory-io.js';

const engine = figjamEngine();
const VARIANTS = `${LOGIN}variant out "Logout"\n  msg api -> client "bye"\n`;
const files = { 'd/login.dgr': VARIANTS, 'd/plain.dgr': LOGIN.replace('"Login"', '"Plain"') };

describe('dgr export figjam', () => {
  it('writes a flattened SVG per picture and variant beside the source, at 1.5 times its size, and board.js', async () => {
    const result = await call(['export', 'figjam', 'd/login.dgr'], { files, engine });
    expect(result).toMatchObject({ exitCode: 0, stderr: '' });
    expect(result.stdout).toBe(
      'wrote d/login.figjam.svg\nwrote d/login.out.figjam.svg\nwrote d/board.js\n' +
        'next: upload the pictures with upload_assets (multipart, so the file name names the layer), then run d/board.js with use_figma\n',
    );
    const svg = String(result.files.get('d/login.out.figjam.svg'));
    expect(svg).toMatch(/viewBox="0 0 200 100" width="300" height="150"/);
    expect(svg).toContain(
      '<text x="10" y="20" fill="#18181b" font-family="JetBrains Mono" font-size="11">Logout</text>',
    );
    expect(svg).not.toMatch(/class=|<style/);
  });

  it('puts everything into the folder of -o, one variant with --variant, and takes --scale', async () => {
    const result = await call(['export', 'figjam', 'd/login.dgr', '-o', 'fj/', '--variant', 'out', '--scale', '2'], {
      files,
      engine,
    });
    expect([...result.files.keys()].filter((path) => path.startsWith('fj/'))).toEqual([
      'fj/login.out.figjam.svg',
      'fj/board.js',
    ]);
    expect(String(result.files.get('fj/login.out.figjam.svg'))).toContain('width="400" height="200"');
  });

  it('reports every picture with its layer, section and size in FigJam, and the path of board.js', async () => {
    const result = await callJson(['export', 'figjam', 'd/login.dgr', 'd/plain.dgr'], { files, engine });
    expect(result.json).toMatchObject({
      ok: true,
      board: 'd/board.js',
      diagnostics: [],
      pictures: [
        { file: 'd/login.dgr', variant: null, output: 'd/login.figjam.svg', layer: 'login.figjam' },
        {
          file: 'd/login.dgr',
          variant: 'out',
          output: 'd/login.out.figjam.svg',
          layer: 'login.out.figjam',
          section: 'diagrist · login.dgr#out',
          width: 300,
          height: 150,
          lost: { filters: 0, letterSpacing: 0 },
        },
        { file: 'd/plain.dgr', variant: null, output: 'd/plain.figjam.svg', section: 'diagrist · plain.dgr' },
      ],
    });
  });

  it('writes the kernel picture as PNG at the scale with --as png', async () => {
    const result = await callJson(['export', 'figjam', 'd/plain.dgr', '--as', 'png'], { files, engine });
    expect(result.json).toMatchObject({ pictures: [{ output: 'd/plain.figjam.png', lost: null }] });
    const png = await call(['export', 'figjam', 'd/plain.dgr', '--as', 'png'], { files, engine });
    expect(fakePng(png.files.get('d/plain.figjam.png'))).toBe(`png 1.5 ${kernelSvg('Plain')}`);
  });

  it('names the board after the first file, or after --board, when there are several pictures', async () => {
    const named = await call(['export', 'figjam', 'd/login.dgr', '--board', 'Anmeldung'], { files, engine });
    expect(String(named.files.get('d/board.js'))).toContain('"name": "diagrist · Anmeldung"');
    const plain = await call(['export', 'figjam', 'd/login.dgr'], { files, engine });
    expect(String(plain.files.get('d/board.js'))).toContain('"id": "board:login"');
    const single = await call(['export', 'figjam', 'd/plain.dgr'], { files, engine });
    expect(String(single.files.get('d/board.js'))).toContain('"board": null');
  });

  it('writes nothing when a diagram has an error', async () => {
    const broken = { ...files, 'd/bad.dgr': LOGIN.replace('-> api', '-> apx') };
    const result = await callJson(['export', 'figjam', 'd/plain.dgr', 'd/bad.dgr'], { files: broken, engine });
    expect(result).toMatchObject({
      exitCode: 1,
      json: { board: null, pictures: [{ output: null }, { output: null }] },
    });
  });
});

describe('dgr export refuses', () => {
  it('a target it does not know (C019)', async () => {
    const result = await call(['export', 'mermaid', 'd/login.dgr'], { files, engine });
    expect(result).toMatchObject({ exitCode: 2, stdout: '' });
    expect(result.stderr).toBe(
      '`mermaid` is no export target. Targets: `figjam`. Example: `dgr export figjam diagrams/order.dgr`\n',
    );
  });

  it.each(['0.5', '4', 'big'])('--scale %s outside 1 to 3 (C013)', async (scale) => {
    const result = await callJson(['export', 'figjam', 'd/login.dgr', '--scale', scale], { files, engine });
    expect(result).toMatchObject({ exitCode: 2, json: { error: { code: 'C013' } } });
    expect(JSON.stringify(result.json)).toContain('from 1 to 3');
  });

  it('a variant the file does not have, with an example of export (C016), and an unknown --as (C007)', async () => {
    const variant = await callJson(['export', 'figjam', 'd/login.dgr', '--variant', 'nope'], { files, engine });
    expect(variant).toMatchObject({ exitCode: 2, json: { error: { code: 'C016' } } });
    expect(JSON.stringify(variant.json)).toContain('dgr export figjam d/login.dgr --variant out');
    const as = await callJson(['export', 'figjam', 'd/login.dgr', '--as', 'pdf'], { files, engine });
    expect(as).toMatchObject({ exitCode: 2, json: { error: { code: 'C007' } } });
  });
});
