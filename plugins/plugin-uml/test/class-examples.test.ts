import { compile } from '@diagrist/core';
import { compareGolden } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { classNames, classSource, golden } from './compile.js';

const plugins = [umlPlugin];

describe('class examples', () => {
  it.each(classNames)('%s compiles without findings, twice to the same bytes', (name) => {
    const first = compile(classSource(name), { plugins });
    expect(first.diagnostics).toEqual([]);
    expect(first.svg).toBeDefined();
    expect(compile(classSource(name), { plugins }).svg).toBe(first.svg);
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
