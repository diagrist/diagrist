import { compile } from '@diagrist/core';
import { compareGolden } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { exampleHashes, golden, sequenceNames, sequenceSource } from './compile.js';

const plugins = [umlPlugin];

describe('sequence examples', () => {
  it.each(sequenceNames)('%s compiles without findings, twice to the same bytes', (name) => {
    const first = compile(sequenceSource(name), { plugins });
    expect(first.diagnostics).toEqual([]);
    expect(first.svg).toBeDefined();
    expect(compile(sequenceSource(name), { plugins }).svg).toBe(first.svg);
  });

  it.each(['oauth-pkce', 'bestellung-saga', 'bestellung-saga-cards', 'oauth-callback'])(
    '%s renders the reviewed picture',
    (name) => {
      const svg = compile(sequenceSource(`${name}.dgr`), { plugins }).svg ?? '';
      expect(compareGolden(golden(`sequence-${name}.svg`), svg)).toEqual({ status: 'match' });
    },
  );

  it('all render the bytes of the predecessor, checked by a SHA-256 per example', () => {
    expect(compareGolden(golden('sequence-examples.sha256'), exampleHashes('sequence'))).toEqual({ status: 'match' });
  });

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
