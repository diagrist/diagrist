import { describe, expect, it } from 'vitest';
import { LOGIN } from './support/fake-engine.js';
import { fakePng } from './support/fake-raster.js';
import { call } from './support/memory-io.js';

const SOURCE = 'diagrams/login.dgr';
const files = { [SOURCE]: LOGIN };
const LOGOUT = LOGIN.replace('"Login"', '"Logout"');
const WRONG_TARGET = LOGIN.replace('-> api', '-> apx');

describe('dgr build --watch', () => {
  it('builds, then builds again after each change, saying what it watches and what it wrote', async () => {
    const result = await call(['build', SOURCE, '--png', '--watch'], { files, changes: [{ [SOURCE]: LOGOUT }] });
    expect(result).toMatchObject({ exitCode: 0, stderr: '' });
    expect(result.stdout).toBe(
      [
        'wrote diagrams/login.svg',
        'wrote diagrams/login.png',
        'watching diagrams/login.dgr, Ctrl+C ends',
        'changed diagrams/login.dgr',
        'wrote diagrams/login.svg',
        'wrote diagrams/login.png',
        '',
      ].join('\n'),
    );
    expect(result.files.get('diagrams/login.svg')).toBe('<svg>Logout</svg>');
    expect(fakePng(result.files.get('diagrams/login.png'))).toBe('png 2 <svg>Logout</svg>');
    expect(result.watcher.watched).toEqual([SOURCE]);
  });

  it('goes on after an error in the diagram and after the source was gone for a moment', async () => {
    const changes = [{ [SOURCE]: WRONG_TARGET }, { [SOURCE]: null }, { [SOURCE]: LOGOUT }];
    const result = await call(['build', SOURCE, '--watch'], { files, changes });
    expect(result.exitCode).toBe(0);
    const builds = result.stdout.split('changed diagrams/login.dgr\n');
    expect(builds).toHaveLength(4);
    expect(builds[1]).toMatch(/^diagrams\/login\.dgr:4:\d+ {2}L\d+ {2}error: /);
    expect(builds[1]).not.toContain('wrote');
    expect(builds[2]).toBe('');
    expect(result.stderr).toBe('Cannot read `diagrams/login.dgr`: no such file.\n');
    expect(builds[3]).toBe('wrote diagrams/login.svg\n');
    expect(result.files.get('diagrams/login.svg')).toBe('<svg>Logout</svg>');
  });

  it('ends with the exit code of the last build', async () => {
    const result = await call(['build', SOURCE, '--watch'], { files, changes: [{ [SOURCE]: WRONG_TARGET }] });
    expect(result.exitCode).toBe(1);
  });

  it.each([
    ['a missing source', ['build', 'diagrams/missing.dgr', '--watch'], 'C008'],
    ['a scale without PNG', ['build', SOURCE, '--scale', '3', '--watch'], 'C014'],
  ])('stops before watching when the first build is refused: %s', async (_case, argv, code) => {
    const result = await call([...argv, '--json'], { files, changes: [{ [SOURCE]: LOGOUT }] });
    expect(result.exitCode).toBe(2);
    expect(JSON.parse(result.stdout)).toMatchObject({ ok: false, error: { code } });
    expect(result.watcher.stopped()).toBe(true);
    expect(result.files.has('diagrams/login.svg')).toBe(false);
  });

  it('prints one JSON document per build with --json, and no status lines', async () => {
    const changes = [{ [SOURCE]: WRONG_TARGET }];
    const result = await call(['build', SOURCE, '--watch', '--json'], { files, changes });
    const documents = result.stdout.split(/\n(?=\{)/).map((text) => JSON.parse(text) as Record<string, unknown>);
    expect(documents).toMatchObject([
      { command: 'build', ok: true, output: 'diagrams/login.svg' },
      { command: 'build', ok: false, output: null },
    ]);
  });

  it('says it in German with --locale de', async () => {
    const result = await call(['build', SOURCE, '--watch', '--locale', 'de'], { files, changes: [{}] });
    expect(result.stdout).toContain('beobachte diagrams/login.dgr, Strg+C beendet\ngeändert: diagrams/login.dgr\n');
  });

  it('watches nothing without --watch, and is an option of build only', async () => {
    const once = await call(['build', SOURCE], { files });
    expect(once.watcher.watched).toEqual([]);
    const checked = await call(['check', SOURCE, '--watch'], { files });
    expect(checked).toMatchObject({ exitCode: 2, stdout: '' });
    expect(checked.stderr).toContain('`dgr check` has no option `--watch`');
    expect(checked.watcher.watched).toEqual([]);
  });
});
