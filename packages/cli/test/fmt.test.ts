import { print, read } from '@diagrist/lang';
import { describe, expect, it } from 'vitest';
import { call, callJson } from './support/memory-io.js';

const MESSY = 'diagram sequence "Login"\n\n\n\nparticipant   client "Browser"\n    participant api "API"\n';
const TIDY = print(read(MESSY).document);
const BROKEN = 'diagram sequence "Login"\nparticipant api "API\n"not a statement"\n';

describe('dgr fmt', () => {
  it('rewrites files with the printer of the language, and a second run changes nothing', async () => {
    const first = await call(['fmt', 'a.dgr', 'b.dgr'], { files: { 'a.dgr': MESSY, 'b.dgr': TIDY } });
    expect(first).toMatchObject({ exitCode: 0, stdout: 'formatted a.dgr\n' });
    expect(first.files.get('a.dgr')).toBe(TIDY);
    const again = await call(['fmt', 'a.dgr'], { files: { 'a.dgr': TIDY } });
    expect(again.stdout).toBe('already formatted: 1 of 1 files\n');
  });

  it('changes nothing with --check and fails when a file is not formatted', async () => {
    const result = await call(['fmt', '--check', 'a.dgr', 'b.dgr'], { files: { 'a.dgr': MESSY, 'b.dgr': TIDY } });
    expect(result).toMatchObject({ exitCode: 1, stdout: 'not formatted: a.dgr\n' });
    expect(result.files.get('a.dgr')).toBe(MESSY);
    expect((await call(['fmt', '--check', 'b.dgr'], { files: { 'b.dgr': TIDY } })).exitCode).toBe(0);
  });

  it('leaves a file with read errors untouched, because printing it would drop the broken lines', async () => {
    const result = await call(['fmt', 'a.dgr'], { files: { 'a.dgr': BROKEN } });
    expect(result.exitCode).toBe(1);
    expect(result.files.get('a.dgr')).toBe(BROKEN);
    expect(result.stdout).toBe(
      [
        'a.dgr:2:17  L001  error: Text is missing its closing quote.',
        '  participant api "API',
        '                  ^^^^',
        'a.dgr:3:1  L002  error: A line starts with a keyword, not with text "not a statement".',
        '  "not a statement"',
        '  ^^^^^^^^^^^^^^^^^',
        'left unchanged because of errors: a.dgr',
        '',
      ].join('\n'),
    );
  });

  it('formats despite warnings and reports them', async () => {
    const result = await call(['fmt', 'a.dgr'], { files: { 'a.dgr': 'diagram sequence "x"\n\tparticipant a\n' } });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('a.dgr:2:1  L003  warning: Indent with spaces, not tabs.');
    expect(result.files.get('a.dgr')).toBe('diagram sequence "x"\n  participant a\n');
  });

  it('writes nothing when one of the files cannot be read', async () => {
    const result = await call(['fmt', 'a.dgr', 'missing.dgr'], { files: { 'a.dgr': MESSY } });
    expect(result).toMatchObject({ exitCode: 2, stderr: 'Cannot read `missing.dgr`: no such file.\n' });
    expect(result.files.get('a.dgr')).toBe(MESSY);
  });

  it('refuses when a file cannot be written', async () => {
    const result = await call(['fmt', 'readonly/a.dgr'], { files: { 'readonly/a.dgr': MESSY } });
    expect(result).toMatchObject({ exitCode: 2, stderr: 'Cannot write `readonly/a.dgr`: permission denied.\n' });
  });

  it('reports every file and every diagnostic with --json', async () => {
    const files = { 'a.dgr': MESSY, 'b.dgr': TIDY, 'c.dgr': BROKEN };
    const { exitCode, json } = await callJson(['fmt', 'a.dgr', 'b.dgr', 'c.dgr', '--locale', 'de'], { files });
    expect(exitCode).toBe(1);
    expect(json.files).toEqual([
      { file: 'a.dgr', status: 'formatted' },
      { file: 'b.dgr', status: 'unchanged' },
      { file: 'c.dgr', status: 'invalid' },
    ]);
    expect(json.diagnostics).toContainEqual({
      file: 'c.dgr',
      code: 'L001',
      severity: 'error',
      span: { line: 2, column: 17, length: 4 },
      values: {},
      message: 'Dem Text fehlt das schließende Anführungszeichen.',
    });
  });
});
