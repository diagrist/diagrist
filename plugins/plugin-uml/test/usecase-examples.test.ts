import { type Compilation, compile } from '@diagrist/core';
import { compareGolden } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { examplePictures, framesPassed, golden, subjects, usecaseNames, usecaseSource } from './compile.js';

const plugins = [umlPlugin];
const pictures = examplePictures('usecase');

/**
 * The examples whose layout takes a second or more. Each is compiled once in this file: every test below reads that
 * compilation, and the SHA-256 golden keeps it the same from run to run instead of a second compilation.
 */
const HEAVY = new Set(['stadtwerke.dgr', 'zwei-systeme.dgr']);

describe('use case examples', () => {
  const drawn = new Map<string, Compilation>();
  const compiled = (name: string) => {
    const got = drawn.get(name) ?? compile(usecaseSource(name), { plugins });
    drawn.set(name, got);
    return got;
  };

  it.each(usecaseNames)('%s compiles without findings', (name) => {
    const first = compiled(name);
    expect(first.diagnostics).toEqual([]);
    expect(first.svg).toBeDefined();
    pictures.keep(name, first.svg ?? '');
  });

  it.each(usecaseNames.filter((name) => !HEAVY.has(name)))('%s compiles twice to the same bytes', (name) => {
    expect(compile(usecaseSource(name), { plugins }).svg).toBe(compiled(name).svg);
  });

  it('all keep their pictures, checked by a SHA-256 per example', () => {
    expect(compareGolden(golden('usecase-examples.sha256'), pictures.hashes())).toEqual({ status: 'match' });
  });

  it.each(usecaseNames.filter((name) => subjects(usecaseSource(name)) > 1))(
    '%s: no line runs through or past a subject it does not end in',
    (name) => {
      expect(framesPassed(compiled(name))).toEqual([]);
    },
  );

  it.each(['onlineshop', 'zwei-systeme', 'auftragsabwicklung-cards'])('%s renders the reviewed picture', (name) => {
    expect(compareGolden(golden(`usecase-${name}.svg`), compiled(`${name}.dgr`).svg ?? '')).toEqual({
      status: 'match',
    });
  });

  it('describes a diagram in German as the predecessor did', () => {
    const text = compiled('onlineshop.dgr').description ?? '';
    expect(compareGolden(golden('usecase-onlineshop.de.txt'), `${text}\n`)).toEqual({ status: 'match' });
  });

  it('writes picture texts and description in English without locale=', () => {
    const result = compile(usecaseSource('onlineshop.dgr').replace(' locale=de', ''), { plugins });
    expect(result.svg).toContain('>Use case diagram (UML) · Onlineshop</text>');
    const lines = result.description?.split('\n') ?? [];
    expect(lines[0]).toBe('Onlineshop. Use case diagram (UML) with 5 actors and 8 use cases.');
    expect(lines).toContain('Bestellung aufgeben includes Bezahlen (include).');
    expect(lines).toContain(
      'Gutschein einlösen extends Bestellung aufgeben at vor Abschluss, when Gutschein vorhanden (extend).',
    );
    expect(lines).toContain(
      'Zahlungsdienst takes part in Bezahlen, multiplicity 1 at Zahlungsdienst, 0..* at Bezahlen.',
    );
  });
});
