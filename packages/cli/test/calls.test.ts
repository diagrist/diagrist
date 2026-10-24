import { describe, expect, it } from 'vitest';
import manifest from '../package.json' with { type: 'json' };
import { fakeEngine, LOGIN } from './support/fake-engine.js';
import { call, callJson } from './support/memory-io.js';

const engine = fakeEngine();
const UNFORMATTED = 'diagram sequence "Login"\n    participant api "API"\n';

describe('exit codes', () => {
  it.each([
    { argv: ['fmt', 'a.dgr'], files: { 'a.dgr': LOGIN }, code: 0, meaning: 'done' },
    { argv: ['check', 'a.dgr'], files: { 'a.dgr': `${LOGIN}msg api -> nobody\n` }, code: 1, meaning: 'an error' },
    { argv: ['fmt', '--check', 'a.dgr'], files: { 'a.dgr': UNFORMATTED }, code: 1, meaning: 'not formatted' },
    { argv: ['fmt', 'missing.dgr'], files: {}, code: 2, meaning: 'unreadable file' },
    { argv: ['frobnicate'], files: {}, code: 2, meaning: 'unknown command' },
    { argv: ['fmt'], files: {}, code: 2, meaning: 'missing argument' },
  ])('are $code for $meaning', async ({ argv, files, code }) => {
    expect((await call(argv, { files, engine })).exitCode).toBe(code);
  });
});

describe('a wrong call', () => {
  it('names an unknown option, suggests the nearest one and shows it in an example', async () => {
    const result = await call(['fmt', '--chek', 'a.dgr'], { files: { 'a.dgr': UNFORMATTED } });
    expect(result).toMatchObject({ exitCode: 2, stdout: '' });
    expect(result.stderr).toBe(
      '`dgr fmt` has no option `--chek`; did you mean `--check`? Allowed: `--check`, `--json`, `--locale`, `--help`. Example: `dgr fmt --check diagrams/*.dgr`\n',
    );
    expect(result.files.get('a.dgr')).toBe(UNFORMATTED);
  });

  it('suggests the nearest command and shows it in use', async () => {
    const { stderr } = await call(['chek', 'a.dgr']);
    expect(stderr).toContain('Unknown command `chek`; did you mean `check`?');
    expect(stderr).toContain('Example: `dgr check diagrams/order.dgr`');
  });

  it('says which argument is missing, what it is and how a correct call looks', async () => {
    const { stderr } = await call(['check'], { engine });
    expect(stderr).toBe('`dgr check` needs <file>: The .dgr file to check. Example: `dgr check diagrams/order.dgr`\n');
  });

  it('rejects an extra argument instead of ignoring it', async () => {
    const result = await call(['check', 'a.dgr', 'b.dgr'], { files: { 'a.dgr': LOGIN }, engine });
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('`dgr check` takes <file>, not also `b.dgr`.');
  });

  it('asks for the value of an option instead of taking the next option as it', async () => {
    const { exitCode, stderr } = await call(['build', 'a.dgr', '-o', '--json'], { engine });
    expect(exitCode).toBe(2);
    expect(stderr).toBe('`-o` needs a value: <file>. Example: `dgr build diagrams/order.dgr -o site/order.svg`\n');
  });

  it('rejects a value on a switch and a value outside the choices', async () => {
    expect((await call(['fmt', '--check=yes', 'a.dgr'])).stderr).toContain('`--check` is a switch and takes no value');
    expect((await call(['fmt', 'a.dgr', '--locale', 'fr'])).stderr).toContain(
      '`fr` is not allowed for `--locale`. Allowed: `en`, `de`.',
    );
  });

  it('expects the command before any option', async () => {
    const { exitCode, stderr } = await call(['--locale', 'en', 'fmt', 'a.dgr']);
    expect(exitCode).toBe(2);
    expect(stderr).toBe('The command comes first, before any option: `dgr fmt …`. Example: `dgr help`\n');
  });

  it('is one JSON document on stdout with --json, nothing on stderr', async () => {
    const result = await call(['fmt', '--chek', '--json']);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toEqual({
      'diagrist-cli': 1,
      command: 'fmt',
      ok: false,
      error: { code: 'C002', message: expect.stringContaining('`--chek`') },
    });
  });

  it('is phrased in German with --locale de', async () => {
    const { stderr } = await call(['fmt', '--locale', 'de']);
    expect(stderr).toBe(
      '`dgr fmt` braucht <files>: The .dgr files to format. Beispiel: `dgr fmt diagrams/order.dgr`\n',
    );
  });
});

describe('help and version', () => {
  it('answers `dgr` alone, `dgr --help` and `dgr help` with the same overview', async () => {
    const overview = (await call(['help'])).stdout;
    expect(overview).toContain('Commands:');
    expect((await call([])).stdout).toBe(overview);
    expect((await call(['--help'])).stdout).toBe(overview);
  });

  it('answers `dgr <command> --help` like `dgr help <command>`, even without the required arguments', async () => {
    const help = await call(['check', '--help']);
    expect(help.exitCode).toBe(0);
    expect(help.stdout).toBe((await call(['help', 'check'])).stdout);
    expect(help.stdout.startsWith('dgr check <file> [options]\n')).toBe(true);
  });

  it('prints the version from package.json', async () => {
    expect((await call(['--version'])).stdout).toBe(`${manifest.version}\n`);
    expect((await callJson(['--version'])).json).toEqual({
      'diagrist-cli': 1,
      command: null,
      ok: true,
      version: manifest.version,
    });
  });
});
