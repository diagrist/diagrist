import { compile } from '@diagrist/core';
import { compareGolden } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { activityNames, activitySource, exampleHashes, golden } from './compile.js';

const plugins = [umlPlugin];

describe('activity examples', () => {
  it('all keep their pictures, checked by a SHA-256 per example', () => {
    expect(compareGolden(golden('activity-examples.sha256'), exampleHashes('activity'))).toEqual({ status: 'match' });
  });

  it.each(activityNames)('%s compiles without findings, twice to the same bytes', (name) => {
    const first = compile(activitySource(name), { plugins });
    expect(first.diagnostics).toEqual([]);
    expect(first.svg).toBeDefined();
    expect(compile(activitySource(name), { plugins }).svg).toBe(first.svg);
  });

  it.each(['auftragsabwicklung', 'karten-belasten', 'positionen-pruefen-cards'])(
    '%s renders the reviewed picture',
    (name) => {
      const svg = compile(activitySource(`${name}.dgr`), { plugins }).svg ?? '';
      expect(compareGolden(golden(`activity-${name}.svg`), svg)).toEqual({ status: 'match' });
    },
  );

  it('describes a diagram in German as the predecessor did', () => {
    const text = compile(activitySource('zahlung-ausnahme.dgr'), { plugins }).description ?? '';
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
