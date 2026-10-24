import { readFileSync } from 'node:fs';
import { umlPlugin } from '@diagrist/plugin-uml';
import { describe, expect, it } from 'vitest';
import { coreEngine } from '../src/core-engine.js';
import { call, callJson } from './support/memory-io.js';

const engine = coreEngine([umlPlugin]);
const example = (name: string): string =>
  readFileSync(new URL(`../../../plugins/plugin-uml/examples/sequence/${name}.dgr`, import.meta.url), 'utf8');
const golden = (name: string): string =>
  readFileSync(new URL(`../../../plugins/plugin-uml/test/__golden__/${name}.svg`, import.meta.url), 'utf8');

describe('the CLI with the real kernel and the UML plugin', () => {
  it('builds a sequence diagram into the same SVG as the plugin golden', async () => {
    const result = await call(['build', 'oauth-pkce.dgr'], {
      files: { 'oauth-pkce.dgr': example('oauth-pkce') },
      engine,
    });
    expect(result.exitCode).toBe(0);
    expect(result.files.get('oauth-pkce.svg')).toBe(golden('oauth-pkce'));
  });

  it('reports findings with their code and position, phrased in the requested locale', async () => {
    const source = 'diagram sequence "x"\nparticipant a "A"\nmsg a -> b "?"\n';
    const english = await callJson(['check', 'x.dgr'], { files: { 'x.dgr': source }, engine });
    const german = await call(['check', 'x.dgr', '--locale', 'de'], { files: { 'x.dgr': source }, engine });
    expect(english.exitCode).toBe(1);
    expect(english.json.diagnostics).toMatchObject([
      { code: 'U400', severity: 'error', span: { line: 3 }, values: { found: 'b', known: '`a`' } },
      { code: 'U901', severity: 'warning', span: { line: 3 } },
    ]);
    expect(german.stdout).toContain('x.dgr:3:1  U400  Fehler:');
    expect(german.stdout).not.toContain('is no declared lifeline');
  });

  it('lists the kinds and describes the sequence grammar for agents', async () => {
    const kinds = await callJson(['grammar'], { engine });
    expect(JSON.stringify(kinds.json)).toContain('sequence');
    const grammar = await callJson(['grammar', 'sequence'], { engine });
    expect(grammar.exitCode).toBe(0);
    expect(JSON.stringify(grammar.json)).toContain('"keyword":"msg"');
  });
});
