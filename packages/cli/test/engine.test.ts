import { grammarOf, kind, statement } from '@diagrist/lang';
import { describe, expect, it } from 'vitest';
import { fakeEngine, LOGIN } from './support/fake-engine.js';
import { call, callJson } from './support/memory-io.js';

const engine = fakeEngine();
const WRONG_TARGET = LOGIN.replace('-> api', '-> apx');

describe('without an engine', () => {
  it.each(['check a.dgr', 'build a.dgr', 'grammar'])(
    '`dgr %s` says that kind support arrives with the kernel',
    async (line) => {
      const result = await call(line.split(' '), { files: { 'a.dgr': LOGIN } });
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain('kind support arrives with @diagrist/core');
      expect(result.stderr).toContain('Example: `dgr fmt diagrams/order.dgr`');
      expect([...result.files.keys()]).toEqual(['a.dgr']);
    },
  );
});

describe('dgr check', () => {
  it('says so when there is nothing to report', async () => {
    expect(await call(['check', 'a.dgr'], { files: { 'a.dgr': LOGIN }, engine })).toMatchObject({
      exitCode: 0,
      stdout: 'a.dgr: no findings\n',
    });
  });

  it('prints each finding with its place, code and the marked source line, and exits with 1 on an error', async () => {
    const result = await call(['check', 'a.dgr'], { files: { 'a.dgr': WRONG_TARGET }, engine });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe(
      [
        'a.dgr:4:15  L107  error: `apx` is not declared; to must be the id of a `participant` declared in this diagram. Declared: `client`, `api`.',
        '  msg client -> apx "POST /login"',
        '                ^^^',
        '',
      ].join('\n'),
    );
  });

  it('passes the locale to the engine', async () => {
    const { json } = await callJson(['check', 'a.dgr', '--locale', 'de'], { files: { 'a.dgr': WRONG_TARGET }, engine });
    expect(json).toMatchObject({ command: 'check', ok: false, file: 'a.dgr' });
    expect(json.diagnostics).toEqual([
      expect.objectContaining({ code: 'L107', values: expect.objectContaining({ found: 'apx' }) }),
    ]);
    expect(JSON.stringify(json.diagnostics)).toContain('ist nicht deklariert');
  });
});

describe('dgr build', () => {
  it('writes the SVG next to the source unless -o says otherwise', async () => {
    const beside = await call(['build', 'diagrams/login.dgr'], { files: { 'diagrams/login.dgr': LOGIN }, engine });
    expect(beside).toMatchObject({ exitCode: 0, stdout: 'wrote diagrams/login.svg\n' });
    expect(beside.files.get('diagrams/login.svg')).toBe('<svg>Login</svg>');
    const elsewhere = await call(['build', 'diagrams/login.dgr', '-o', 'site/x.svg'], {
      files: { 'diagrams/login.dgr': LOGIN },
      engine,
    });
    expect([...elsewhere.files.keys()]).toEqual(['diagrams/login.dgr', 'site/x.svg']);
  });

  it('writes nothing when the diagram has an error', async () => {
    const result = await callJson(['build', 'a.dgr'], { files: { 'a.dgr': WRONG_TARGET }, engine });
    expect(result.exitCode).toBe(1);
    expect(result.json).toMatchObject({ ok: false, output: null });
    const files = (await call(['build', 'a.dgr'], { files: { 'a.dgr': WRONG_TARGET }, engine })).files;
    expect(files.has('a.svg')).toBe(false);
  });
});

describe('dgr grammar', () => {
  it('lists the kinds with their doc', async () => {
    expect((await call(['grammar'], { engine })).stdout).toBe('sequence  Messages between lifelines over time.\n');
    expect((await callJson(['grammar'], { engine })).json.kinds).toEqual([
      { kind: 'sequence', doc: 'Messages between lifelines over time.' },
    ]);
  });

  it('gives the grammar of a kind as the engine derives it, as data and readable', async () => {
    expect((await callJson(['grammar', 'sequence'], { engine })).json.grammar).toEqual(engine.grammar('sequence'));
    const text = (await call(['grammar', 'sequence'], { engine })).stdout;
    expect(text).toContain('msg <from> <arrow> <to> [label]');
    expect(text).toContain('  <arrow>  `->` call, `-->` reply. Expected: one of the arrows `->`, `-->`.');
    expect(text).toContain('  example: msg client -> api "GET /orders"');
  });

  it('shows children and line forms below their statement', async () => {
    const step = statement('step', { doc: 'One step.', examples: ['step a'], arguments: [] });
    const flow = statement('flow', { doc: 'Steps in order.', examples: ['flow'], children: [step] });
    const nested = kind('flows', { doc: 'Flows.', statements: [flow] });
    const text = (await call(['grammar', 'flows'], { engine: { ...engine, grammar: () => grammarOf(nested) } })).stdout;
    expect(text).toContain('\nflow\n  Steps in order.\n  example: flow\n\n  step\n    One step.\n');
  });

  it('suggests the nearest kind for an unknown one', async () => {
    const result = await call(['grammar', 'sequense'], { engine });
    expect(result).toMatchObject({ exitCode: 2 });
    expect(result.stderr).toBe(
      'Unknown diagram kind `sequense`; did you mean `sequence`? Kinds: `sequence`. Example: `dgr grammar sequence`\n',
    );
  });
});
