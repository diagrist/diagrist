import { describe, expect, it } from 'vitest';
import { LOGIN } from './support/fake-engine.js';
import { call, callJson } from './support/memory-io.js';

const VARIANTS = `${LOGIN}variant out "Logout"\n  msg api -> client "bye"\nvariant err "Error" from out\n  drop msg api -> client "bye"\n`;
const files = { 'd/login.dgr': VARIANTS };

describe('dgr build with variants', () => {
  it('writes the base and every variant beside the source, and lists them in JSON', async () => {
    const result = await callJson(['build', 'd/login.dgr'], { files });
    expect(result.exitCode).toBe(0);
    expect(result.json).toMatchObject({
      output: 'd/login.svg',
      pictures: [
        { variant: null, output: 'd/login.svg', png: null },
        { variant: 'out', output: 'd/login.out.svg', png: null },
        { variant: 'err', output: 'd/login.err.svg', png: null },
      ],
    });
    const text = await call(['build', 'd/login.dgr', '--png'], { files });
    expect(text.files.get('d/login.out.svg')).toBe('<svg>Logout</svg>');
    expect(text.stdout).toContain('wrote d/login.err.svg\nwrote d/login.err.png\n');
  });

  it('builds one picture with --variant, also to -o', async () => {
    const one = await call(['build', 'd/login.dgr', '--variant', 'err', '-o', 'site/err.svg'], { files });
    expect(one).toMatchObject({ exitCode: 0, stdout: 'wrote site/err.svg\n' });
    expect(one.files.get('site/err.svg')).toBe('<svg>Error</svg>');
  });

  it('refuses a variant the file does not have (C016) and -o for several pictures (C017)', async () => {
    const unknown = await callJson(['build', 'd/login.dgr', '--variant', 'nope'], { files });
    expect(unknown).toMatchObject({ exitCode: 2, json: { error: { code: 'C016' } } });
    expect(JSON.stringify(unknown.json)).toContain('Variants: `out`, `err`.');
    const several = await callJson(['build', 'd/login.dgr', '-o', 'x.svg'], { files });
    expect(several).toMatchObject({ exitCode: 2, json: { error: { code: 'C017' } } });
    const single = await callJson(['build', 'a.dgr', '-o', 'x.svg'], { files: { 'a.dgr': LOGIN } });
    expect(single.exitCode).toBe(0);
  });
});

describe('a diagram that uses another file', () => {
  const paper =
    'diagram sequence "Paper"\nuse "../base/login.dgr"\nvariant mine "Mine" from out\n  msg client -> api "again"\n';
  const used = { 'base/login.dgr': VARIANTS, 'papers/paper.dgr': paper };

  it('reads the used file relative to the source and builds its own pictures only', async () => {
    const result = await callJson(['build', 'papers/paper.dgr'], { files: used });
    expect(result.json.pictures).toEqual([
      { variant: null, output: 'papers/paper.svg', png: null },
      { variant: 'mine', output: 'papers/paper.mine.svg', png: null },
    ]);
  });

  it('refuses when a used file cannot be read (C018), naming the line', async () => {
    const result = await call(['build', 'papers/paper.dgr'], { files: { 'papers/paper.dgr': paper } });
    expect(result).toMatchObject({ exitCode: 2 });
    expect(result.stderr).toBe('Cannot read `base/login.dgr`, named in line 2 of `papers/paper.dgr`: no such file.\n');
  });

  it('refuses a used file behind a link out of the working folder, or larger than 1 MB (C018)', async () => {
    const linked = 'diagram sequence "Paper"\nuse "../linked/login.dgr"\n';
    const outside = await call(['check', 'papers/paper.dgr'], {
      files: { 'papers/paper.dgr': linked, 'linked/login.dgr': LOGIN },
    });
    expect(outside.stderr).toContain('its real place lies outside the folder `dgr` runs in, through a link');
    const large = await call(['check', 'papers/paper.dgr'], {
      files: { ...used, 'base/login.dgr': `${LOGIN}${'#'.repeat(1024 * 1024)}\n` },
    });
    expect(large.stderr).toContain('it is larger than 1 MB');
  });

  it('prints a finding in the used file with its path and line, and one about a picture with its variant', async () => {
    const broken = { ...used, 'base/login.dgr': `${VARIANTS}msg api -> nobody\n` };
    const result = await call(['check', 'papers/paper.dgr'], { files: broken });
    expect(result.stdout).toContain('base/login.dgr:9:');
    expect(result.stdout).toContain('  msg api -> nobody\n');
    const own = await call(['check', 'papers/paper.dgr'], {
      files: { ...used, 'papers/paper.dgr': `${paper}  msg client -> nobody\n` },
    });
    expect(own.stdout).toMatch(/^papers\/paper\.dgr:5:\d+ {2}\[mine\] {2}L107/);
  });

  it('watches the used file too', async () => {
    const result = await call(['build', 'papers/paper.dgr', '--watch'], { files: used, changes: [{}] });
    expect(result.watcher.watched).toEqual(['papers/paper.dgr', 'base/login.dgr']);
  });
});
