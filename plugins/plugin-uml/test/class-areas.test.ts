import { compile } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';

const picture = (header: string) =>
  compile(
    [
      `diagram class "Test" ${header}`.trimEnd(),
      'area kern "Kern"',
      'area zahlung "Zahlungen" tone=green',
      'package pay "zahlung" area=zahlung',
      'class ausleihe "Ausleihe" area=kern',
      'class tarif "Tarif" in pay',
      'rel tarif -> ausleihe "liest" source=1 card=1',
    ].join('\n'),
    { plugins: [umlPlugin] },
  );

describe('areas in class diagrams', () => {
  const plain = picture('locale=de');

  it('mark classes, the members of a package and its frame, and leave the core in ink', () => {
    expect(plain.diagnostics.filter((d) => d.severity !== 'warning')).toEqual([]);
    expect(plain.svg).toContain('<g id="node-tarif" class="area-green">');
    expect(plain.svg).toContain('<g id="node-ausleihe">');
    expect(plain.svg).toContain('<g id="group-pay" class="area-green-line">');
  });

  it('give a relation from an extension to the core the tone of the extension', () => {
    expect(plain.svg).toContain('<g id="edge-0" class="area-green-line">');
  });

  it('append a legend of the areas, since a class diagram draws none, and name them in the description', () => {
    expect(plain.svg).toContain('>Zahlungen</text>');
    expect(plain.svg).toContain('>Kern</text>');
    expect(plain.description).toContain('Bereich Zahlungen (grün): Tarif.');
  });

  it('keep a picture without areas as it was, without a legend', () => {
    const none = compile('diagram class "Test"\nclass a "A"', { plugins: [umlPlugin] });
    expect(none.svg).not.toContain('area-');
    expect(none.svg).not.toContain('class="legend"');
  });
});
