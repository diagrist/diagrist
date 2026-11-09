import { compile } from '@diagrist/core';
import { compareGolden, formCounts } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { classNames, classSource, compiledOnce, examplePictures, golden } from './compile.js';

const plugins = [umlPlugin];
/** Forms of the nodes of two examples: classes boxes, rounded as cards, an n-ary association a diamond. */
const FORMS: readonly (readonly [string, Record<string, number>])[] = [
  ['stundenplan.dgr', { box: 5, diamond: 1 }],
  ['auftragsabwicklung-cards.dgr', { rounded: 10 }],
];
const pictures = examplePictures('class');

describe('class examples', () => {
  const compiled = compiledOnce(classSource);

  it.each(classNames)('%s compiles without findings, twice to the same bytes', (name) => {
    const first = compiled(name);
    expect(first.diagnostics).toEqual([]);
    expect(first.svg).toBeDefined();
    expect(compile(classSource(name), { plugins }).svg).toBe(first.svg);
    pictures.keep(name, first.svg ?? '');
  });

  it.each(classNames)('%s gives every node the form of its body', (name) => {
    expect(formCounts(compiled(name).pictures)).not.toHaveProperty('none');
  });

  it.each(FORMS)('%s draws its nodes in these forms', (name, counts) => {
    expect(formCounts(compiled(name).pictures)).toEqual(counts);
  });

  it('all keep their pictures, checked by a SHA-256 per example', () => {
    expect(compareGolden(golden('class-examples.sha256'), pictures.hashes())).toEqual({ status: 'match' });
  });

  it.each(['auftragsabwicklung', 'pakete'])('%s renders the reviewed picture', (name) => {
    const svg = compile(classSource(`${name}.dgr`), { plugins }).svg ?? '';
    expect(compareGolden(golden(`class-${name}.svg`), svg)).toEqual({ status: 'match' });
  });

  it('describes a diagram in German as the predecessor did', () => {
    const text = compile(classSource('pakete.dgr'), { plugins }).description ?? '';
    expect(compareGolden(golden('class-pakete.de.txt'), `${text}\n`)).toEqual({ status: 'match' });
  });

  it('writes picture texts and description in English without locale=', () => {
    const result = compile(classSource('stundenplan.dgr').replace(' locale=de', ''), { plugins });
    expect(result.svg).toContain('>Class diagram (UML) · Stundenplan</text>');
    const lines = result.description?.split('\n') ?? [];
    expect(lines[0]).toBe('Stundenplan. Class diagram (UML) with 5 classes, 1 n-ary association and 0 relations.');
    expect(lines).toContain(
      'N-ary association Unterricht joins Dozent (1), Kurs (0..*), Raum (0..1) and Termin (*); association class Unterrichtseinheit.',
    );
    expect(lines).toContain('Note on Dozent: Genau ein Dozent je Stunde.');
  });
});
