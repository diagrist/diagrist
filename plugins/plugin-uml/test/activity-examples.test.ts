import { compile } from '@diagrist/core';
import { compareGolden, formCounts } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { activityNames, activitySource, compiledOnce, examplePictures, golden } from './compile.js';

const plugins = [umlPlugin];
/** Forms of the nodes of two examples: actions rounded, start and ends circles, decisions diamonds, bars and signals symbols. */
const FORMS: readonly (readonly [string, Record<string, number>])[] = [
  ['auftragsabwicklung-cards.dgr', { box: 1, circle: 4, diamond: 3, rounded: 10, symbol: 6 }],
  ['bestellbestaetigung.dgr', { circle: 3, rounded: 4, symbol: 1 }],
];
const pictures = examplePictures('activity');

/**
 * The examples whose layout takes a second or more. Each example is compiled once in this file: every test below reads
 * that compilation, and the SHA-256 golden keeps it the same from run to run instead of a second compilation.
 */
const HEAVY = new Set(['auftragsabwicklung.dgr', 'auftragsabwicklung-cards.dgr']);

describe('activity examples', () => {
  const compiled = compiledOnce(activitySource);

  it.each(activityNames)('%s compiles without findings', (name) => {
    const first = compiled(name);
    expect(first.diagnostics).toEqual([]);
    expect(first.svg).toBeDefined();
    pictures.keep(name, first.svg ?? '');
  });

  it.each(activityNames.filter((name) => !HEAVY.has(name)))('%s compiles twice to the same bytes', (name) => {
    expect(compile(activitySource(name), { plugins }).svg).toBe(compiled(name).svg);
  });

  it.each(activityNames)('%s gives every node the form of its body', (name) => {
    expect(formCounts(compiled(name).pictures)).not.toHaveProperty('none');
  });

  it.each(FORMS)('%s draws its nodes in these forms', (name, counts) => {
    expect(formCounts(compiled(name).pictures)).toEqual(counts);
  });

  it('all keep their pictures, checked by a SHA-256 per example', () => {
    expect(compareGolden(golden('activity-examples.sha256'), pictures.hashes())).toEqual({ status: 'match' });
  });

  it.each(['auftragsabwicklung', 'karten-belasten', 'positionen-pruefen-cards'])(
    '%s renders the reviewed picture',
    (name) => {
      const svg = compiled(`${name}.dgr`).svg ?? '';
      expect(compareGolden(golden(`activity-${name}.svg`), svg)).toEqual({ status: 'match' });
    },
  );

  it('describes a diagram in German as the predecessor did', () => {
    const text = compiled('zahlung-ausnahme.dgr').description ?? '';
    expect(compareGolden(golden('activity-zahlung-ausnahme.de.txt'), `${text}\n`)).toEqual({ status: 'match' });
  });

  it('writes picture texts and description in English without locale=', () => {
    const result = compile(activitySource('preise-berechnen.dgr').replace(' locale=de', ''), { plugins });
    expect(result.svg).toContain('>Activity diagram (UML) · Preise berechnen</text>');
    const lines = result.description?.split('\n') ?? [];
    expect(lines[0]).toBe('Preise berechnen. Activity diagram (UML) with 9 nodes and 14 edges in 2 lanes.');
    expect(lines).toContain('Fork: at the same time Positionen lesen and Preisliste laden.');
    expect(lines).toContain(
      'Expansion region "Preis je Position" «iterative» runs one element after the other of the collections "Positionen" and "Preisliste": Preis berechnen.',
    );
    expect(lines).toContain('Input "Positionen" of "Preis je Position" ⇒ Preis berechnen through pin "Position".');
  });
});
