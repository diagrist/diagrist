import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { coreEngine } from '../src/core-engine.js';
import { PLUGINS } from '../src/plugins.js';
import { call } from './support/memory-io.js';

const plugins = new URL('../../../plugins/', import.meta.url);
const engine = coreEngine(PLUGINS);

/** The first example of every kind, by path. */
const examples = new Map<string, string>();
for (const path of readdirSync(plugins, { recursive: true, encoding: 'utf8' }).sort()) {
  if (!/^[^/]+\/examples\/.+\.dgr$/.test(path)) continue;
  const source = readFileSync(new URL(path, plugins), 'utf8');
  const kind = /^diagram (\S+)/m.exec(source)?.[1];
  if (kind !== undefined && !examples.has(kind)) examples.set(kind, source);
}

/** What XML 1.0 cannot hold; an SVG with one of these is not read by any XML parser. */
const NOT_XML = /(?![\t\n\r\x7F-\x9F])[\p{Cc}\p{Cs}￾￿]/u;

const header = (source: string): string => source.split('\n').find((line) => line.startsWith('diagram ')) ?? '';
const bytes = new TextDecoder().decode(Uint8Array.from({ length: 600 }, (_, i) => (i * 37 + 11) % 256));

/** Inputs that once crashed `dgr` or gave an SVG no parser reads, or that tools write: each must end in findings. */
const ADVERSARIAL: Readonly<Record<string, (source: string) => string>> = {
  'a control character in a text': (source) => source.replace('"', '"\u0001\u001b'),
  'a lone surrogate and U+FFFF in a text': (source) => source.replace('"', '"\ud800￿'),
  'binary after the header': (source) => `${header(source)}\n${bytes}`,
  '1500 nested statements': (source) => {
    const [first = 'x'] = source.split('\n').filter((line) => /^[a-z]/.test(line) && !line.startsWith('diagram '));
    return [header(source), ...Array.from({ length: 1500 }, (_, level) => `${'  '.repeat(level)}${first}`)].join('\n');
  },
  'a text of 20,000 characters': (source) => source.replace(/"[^"]*"/, `"${'W'.repeat(20_000)}"`),
};

/** Ways of writing the same diagram that editors and other systems produce; each draws the same picture. */
const SAME: Readonly<Record<string, (source: string) => string>> = {
  'a byte order mark and CRLF': (source) => `﻿${source.replace(/\n/g, '\r\n')}`,
  'line endings of a lone CR': (source) => source.replace(/\n/g, '\r'),
};

describe.each([...examples])('a %s diagram', (_kind, source) => {
  const drawn = engine.compile(source, { locale: 'en' }).svg;

  it.each(Object.entries(ADVERSARIAL))('with %s gives findings or an SVG that XML can read', (_case, change) => {
    const result = engine.compile(change(source), { locale: 'en' });
    expect(result.diagnostics.map((d) => d.code)).not.toContain('K110');
    expect(NOT_XML.test(result.svg ?? '')).toBe(false);
  });

  it.each(Object.entries(SAME))('written with %s draws the same picture', (_case, change) => {
    expect(engine.compile(change(source), { locale: 'en' }).svg).toBe(drawn);
  });
});

describe('dgr with the real plugins', () => {
  const nested = (levels: number) => [
    'diagram sequence "Deep"',
    'participant a "A"',
    'participant b "B"',
    ...Array.from({ length: levels }, (_, level) => `${'  '.repeat(level)}alt "[ok]"`),
    `${'  '.repeat(levels)}msg a -> b "go"`,
  ];

  it('rejects 1500 nested fragments with L006 instead of exhausting the stack, and draws 63', async () => {
    const deep = await call(['build', 'deep.dgr'], { files: { 'deep.dgr': nested(1500).join('\n') }, engine });
    expect(deep).toMatchObject({ exitCode: 1, stderr: '' });
    expect(deep.stdout).toMatch(/^deep\.dgr:68:129 {2}L006 {2}error: Statements nest at most 64 levels deep/);
    expect(deep.files.has('deep.svg')).toBe(false);
    const deepest = await call(['build', 'deep.dgr'], { files: { 'deep.dgr': nested(63).join('\n') }, engine });
    expect(deepest.exitCode).toBe(0);
  });

  it('rejects a control character in a label with L005 and writes no SVG', async () => {
    const source = 'diagram sequence "T"\nparticipant a "A\u0001b"\n';
    const result = await call(['build', 'ctrl.dgr'], { files: { 'ctrl.dgr': source }, engine });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('ctrl.dgr:2:17  L005  error: The character U+0001 cannot stand in a diagram');
    expect(result.files.has('ctrl.svg')).toBe(false);
  });
});
