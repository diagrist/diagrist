import { compile } from '@diagrist/core';
import { compareGolden } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { exampleHashes, golden, usecaseNames, usecaseSource } from './compile.js';

const plugins = [umlPlugin];

describe('use case examples', () => {
  it('all keep their pictures, checked by a SHA-256 per example', () => {
    expect(compareGolden(golden('usecase-examples.sha256'), exampleHashes('usecase'))).toEqual({ status: 'match' });
  });

  it.each(usecaseNames)('%s compiles without findings, twice to the same bytes', (name) => {
    const first = compile(usecaseSource(name), { plugins });
    expect(first.diagnostics).toEqual([]);
    expect(first.svg).toBeDefined();
    expect(compile(usecaseSource(name), { plugins }).svg).toBe(first.svg);
  });

  it.each(['onlineshop', 'zwei-systeme', 'auftragsabwicklung-cards'])('%s renders the reviewed picture', (name) => {
    const svg = compile(usecaseSource(`${name}.dgr`), { plugins }).svg ?? '';
    expect(compareGolden(golden(`usecase-${name}.svg`), svg)).toEqual({ status: 'match' });
  });

  it('describes a diagram in German as the predecessor did', () => {
    const text = compile(usecaseSource('onlineshop.dgr'), { plugins }).description ?? '';
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
