import { describe, expect, it } from 'vitest';
import { VOCABULARY_SOURCES } from '../src/shared/vocabularies.js';
import { codes, compileExample } from './compile.js';

const VOCABULARY = [
  'diagram vocabulary "Kontrollen"',
  'type risiko "Risiko"',
  'type kontrolle "Kontrolle" shape=doc',
  'link mindert "mindert" from=kontrolle to=risiko each=to',
].join('\n');

/** A concept picture beside the vocabulary file `v.dgr`, with the given lines below its header. */
const picture = (vocabulary: string, ...lines: string[]) =>
  compileExample('bank/test.dgr', ['diagram concept "Test" use="v.dgr"', ...lines].join('\n'), {
    'bank/v.dgr': vocabulary,
  });

describe('vocabulary files', () => {
  it('give a concept picture their types and links, and their rules', () => {
    const ok = picture(VOCABULARY, 'item r "R" is risiko', 'item k "K" is kontrolle', 'rel k mindert r');
    expect(codes(ok)).toEqual([]);
    expect(ok.needs.map((n) => n.path)).toEqual(['bank/v.dgr']);
    expect(codes(picture(VOCABULARY, 'item r "R" is risiko', 'item k "K" is kontrolle'))).toContain('M115');
  });

  it('report a vocabulary file that does not read cleanly, and one that is no vocabulary', () => {
    const broken = picture(`${VOCABULARY}\nlink x "X" from=risiko to=kontrolle head=wide`, 'item r "R" is risiko');
    expect(codes(broken)).toContain('M120');
    expect(broken.diagnostics.find((d) => d.code === 'M120')?.values).toMatchObject({ path: 'bank/v.dgr', line: '5' });
    expect(codes(picture('diagram concept "Kein Vokabular"', 'item r "R" is risiko'))).toContain('M120');
  });

  it('may not be declared again by the picture that uses them', () => {
    const result = picture(VOCABULARY, 'type risiko "Risiko"');
    expect(result.diagnostics.find((d) => d.code === 'M113')?.values).toMatchObject({ vocabulary: 'bank/v.dgr' });
  });

  it('draw themselves: a type per item, a line per link, what a link asks of a type as its entry, no legend', () => {
    const result = compileExample('bank/iks.vocab.dgr');
    expect(codes(result)).toEqual([]);
    expect(result.anchors?.nodes.map((n) => n.id)).toEqual(['prozess', 'risiko', 'kontrolle', 'rolle']);
    expect(result.svg).toContain('verantwortet: genau eine');
    expect(result.svg).not.toContain('legendRule');
    expect(result.description).toContain('Rolle verantwortet: Kontrolle (genau eine je Kontrolle).');
  });

  it('show a link of a type to itself as an entry of the type, as the vocabularies of the plugin do', () => {
    for (const source of Object.values(VOCABULARY_SOURCES)) {
      expect(codes(compileExample('bank/shipped.dgr', source))).toEqual([]);
    }
    const terms = compileExample('bank/terms.dgr', VOCABULARY_SOURCES.terms);
    expect(terms.svg).toContain('is a · no cycles: Term');
    expect(terms.anchors?.edges).toEqual([]);
  });

  it('report a link between types they do not declare', () => {
    const result = compileExample('bank/v.dgr', `${VOCABULARY}\nlink y "Y" from=rolle to=risiko`);
    expect(codes(result)).toEqual(['M112']);
  });
});
