import type { Compilation } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { codes, concept } from './compile.js';

const found = (result: Compilation) => result.diagnostics.filter((d) => d.severity === 'error');
const errors = (result: Compilation) => found(result).map((d) => d.code);

/** A vocabulary of the file: roles carry out tasks, each task by someone; a task creates at most one document. */
const DECLARED = [
  'type rolle "Rolle" shape=person',
  'type aufgabe "Aufgabe"',
  'type beleg "Beleg" shape=doc',
  'link fuehrt "führt aus" from=rolle to=aufgabe each=to',
  'link erzeugt "erzeugt" from=aufgabe to=beleg single=from',
];

const file = (...lines: string[]) => concept('', ...DECLARED, ...lines);

describe('concept rules', () => {
  it('draws a file that keeps its declarations', () => {
    const result = file(
      'item kunde "Kunde" is rolle',
      'item ausleihen "Rad ausleihen" is aufgabe',
      'item vertrag "Mietvertrag" is beleg',
      'rel kunde fuehrt ausleihen',
      'rel ausleihen erzeugt vertrag',
    );
    expect(codes(result)).toEqual([]);
    expect(result.svg).toContain('node-ausleihen');
  });

  it('reports an item of an undeclared type, and one without a type, with the declared types', () => {
    const result = file('item a "A" is rolel', 'item b "B"');
    expect(errors(result)).toEqual(['M110', 'M110']);
    expect(found(result)[0]?.values).toMatchObject({ case: 'unknown', nearest: 'rolle' });
    expect(found(result)[1]?.values).toMatchObject({ case: 'none', types: '`rolle`, `aufgabe`, `beleg`' });
  });

  it('reports a relation of an undeclared link and a link of an undeclared type', () => {
    const result = concept(
      '',
      'type t "T"',
      'link l "L" from=t to=t,x',
      'item a "A" is t',
      'item b "B" is t',
      'rel a k b',
      'rel a l b',
    );
    expect(codes(result)).toEqual(['M112', 'M111']);
  });

  it('reports a type or link the vocabulary declares already', () => {
    const result = concept('vocabulary=terms', 'type term "Begriff"', 'link is-a "ist ein" from=term to=term');
    expect(codes(result)).toEqual(['M113', 'M113']);
    expect(result.diagnostics[1]?.values).toMatchObject({ case: 'link', id: 'is-a', vocabulary: 'terms' });
  });

  it('reports a relation between types its link does not join', () => {
    const result = file(
      'item kunde "Kunde" is rolle',
      'item ausleihen "Rad ausleihen" is aufgabe',
      'rel kunde fuehrt ausleihen',
      'rel ausleihen fuehrt kunde',
    );
    expect(errors(result)).toEqual(['M114', 'M114']);
  });

  it('asks every item a link counts with each= for a relation, and allows one with single=', () => {
    const result = file(
      'item kunde "Kunde" is rolle',
      'item offen "Offen" is aufgabe',
      'item zwei "Zwei" is aufgabe',
      'item v1 "V1" is beleg',
      'item v2 "V2" is beleg',
      'rel kunde fuehrt zwei',
      'rel zwei erzeugt v1',
      'rel zwei erzeugt v2',
    );
    expect(errors(result)).toEqual(['M115', 'M116']);
    expect(found(result)[0]?.values).toMatchObject({ item: 'offen', link: 'fuehrt', side: 'to' });
    expect(found(result)[1]?.values).toMatchObject({ item: 'zwei', count: '2' });
  });

  it('reports a cycle through an acyclic link with its items, and a relation of an item with itself', () => {
    const result = concept(
      'vocabulary=terms',
      'item a "A" is term',
      '  "a"',
      'item b "B" is term',
      '  "b"',
      'rel a is-a b',
      'rel b is-a a',
      'rel a relates a',
    );
    expect(codes(result)).toEqual(['M117', 'M118']);
    expect(result.diagnostics[0]?.values.items).toBe('a → b → a');
  });

  it('asks every term for a definition', () => {
    expect(errors(concept('vocabulary=terms', 'item a "A" is term'))).toEqual(['M119']);
  });

  it('warns of declarations the file does not use and of more than six types', () => {
    const types = Array.from({ length: 7 }, (_, i) => [`type t${i} "T${i}"`, `item i${i} "I${i}" is t${i}`]).flat();
    expect(codes(concept('', ...types))).toEqual(['M611']);
    expect(codes(file('item kunde "Kunde" is rolle'))).toEqual(['M610', 'M610', 'M610', 'M610', 'M612']);
  });

  it('asks to settle two terms of the same meaning by marking one deprecated', () => {
    const terms = ['item a "A" is term', '  "a"', 'item b "B" is term', '  "b"', 'rel a same-as b'];
    expect(codes(concept('vocabulary=terms', ...terms))).toEqual(['M613']);
    expect(codes(concept('vocabulary=terms', ...terms.with(2, 'item b "B" is term status=deprecated')))).toEqual([]);
  });

  it('allows a role one lead at most, and lets nobody stand in for themselves', () => {
    const roles = ['item a "A" is role', 'item b "B" is role', 'item c "C" is role'];
    expect(codes(concept('vocabulary=roles', ...roles, 'rel a reports-to b', 'rel a reports-to c'))).toEqual(['M116']);
    expect(codes(concept('vocabulary=roles', ...roles, 'rel a reports-to b', 'rel c deputy c'))).toEqual(['M118']);
  });
});
