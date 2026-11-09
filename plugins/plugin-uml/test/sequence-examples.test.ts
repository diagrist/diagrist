import { compile } from '@diagrist/core';
import { compareGolden, formCounts } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { compiledOnce, examplePictures, golden, sequenceNames, sequenceSource } from './compile.js';

const plugins = [umlPlugin];
/** Forms of the nodes of two examples: heads boxes, rounded as cards, a database a cylinder, a queue a lying tube, an actor a symbol. */
const FORMS: readonly (readonly [string, Record<string, number>])[] = [
  ['bestellung-saga.dgr', { box: 5, cylinder: 1, queue: 1, symbol: 1 }],
  ['bestellung-saga-cards.dgr', { cylinder: 1, queue: 1, rounded: 5, symbol: 1 }],
];
const pictures = examplePictures('sequence');

describe('sequence examples', () => {
  const compiled = compiledOnce(sequenceSource);

  it.each(sequenceNames)('%s compiles without findings, twice to the same bytes', (name) => {
    const first = compiled(name);
    expect(first.diagnostics).toEqual([]);
    expect(first.svg).toBeDefined();
    expect(compile(sequenceSource(name), { plugins }).svg).toBe(first.svg);
    pictures.keep(name, first.svg ?? '');
  });

  it.each(sequenceNames)('%s gives every node the form of its body', (name) => {
    expect(formCounts(compiled(name).pictures)).not.toHaveProperty('none');
  });

  it.each(FORMS)('%s draws its nodes in these forms', (name, counts) => {
    expect(formCounts(compiled(name).pictures)).toEqual(counts);
  });

  it('all keep their pictures, checked by a SHA-256 per example', () => {
    expect(compareGolden(golden('sequence-examples.sha256'), pictures.hashes())).toEqual({ status: 'match' });
  });

  it.each(['oauth-pkce', 'bestellung-saga', 'bestellung-saga-cards', 'oauth-callback'])(
    '%s renders the reviewed picture',
    (name) => {
      const svg = compile(sequenceSource(`${name}.dgr`), { plugins }).svg ?? '';
      expect(compareGolden(golden(`sequence-${name}.svg`), svg)).toEqual({ status: 'match' });
    },
  );

  it('describes a diagram in German with locale=de', () => {
    const text = compile(sequenceSource('bestellung-bestaetigen.dgr'), { plugins }).description ?? '';
    expect(compareGolden(golden('sequence-bestellung-bestaetigen.de.txt'), `${text}\n`)).toEqual({ status: 'match' });
  });

  it('writes picture texts and description in English without locale=', () => {
    const result = compile(sequenceSource('oauth-pkce.dgr').replace(' locale=de', ''), { plugins });
    expect(result.svg).toContain('>Sequence diagram (UML) · Anmeldung mit OAuth 2.0</text>');
    expect(result.description?.split('\n')[0]).toBe(
      'Anmeldung mit OAuth 2.0. Sequence diagram (UML) with 4 participants and 14 messages.',
    );
  });
});
