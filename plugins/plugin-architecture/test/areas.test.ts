import { compile } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { architecturePlugin } from '../src/index.js';

const SOURCE = [
  'grid cols a,b,c',
  'grid rows main',
  'area kern "Kern"',
  'area zahlung "Zahlungen" tone=green',
  'group pay "Zahlungen" own area=zahlung',
  'container api "API" at a/main area=kern',
  'container tarif "Tarif" at b/main in pay',
  'container psp "Anbieter" at c/main area=zahlung',
  'edge api -> tarif "abrechnen"',
  'edge tarif -> psp "abbuchen"',
];

const picture = (header: string) =>
  compile([`diagram container "Test" ${header}`.trimEnd(), ...SOURCE].join('\n'), { plugins: [architecturePlugin] });

describe('areas in C4 pictures', () => {
  const plain = picture('locale=de');

  it('mark the elements of an area and the members of its frame, and leave the core in ink', () => {
    expect(plain.diagnostics).toEqual([]);
    expect(plain.svg).toContain('<g id="node-tarif" class="area-green">');
    expect(plain.svg).toContain('<g id="node-psp" class="area-green">');
    expect(plain.svg).toContain('<g id="node-api">');
    expect(plain.svg).toContain('<g id="group-pay" class="area-green-line">');
  });

  it('give an edge from the core into an extension the tone of the extension, with its label', () => {
    expect(plain.svg).toContain('<g id="edge-0" class="area-green-line">');
    expect(plain.svg).toContain('<g id="label-0" class="area-green-line">');
  });

  it('name the areas in the legend and in the description', () => {
    expect(plain.svg).toContain('>Zahlungen</text>');
    expect(plain.description).toContain('Bereich Zahlungen (grün): Tarif, Anbieter.');
    expect(plain.description).toContain('Bereich Kern (schwarz): API.');
  });

  it('name them as sentences in a look with a sentence legend', () => {
    expect(picture('look=paper locale=de').svg).toContain('Grün: Zahlungen.');
  });

  it('are painted as the header says', () => {
    expect(picture('areas=stripe').svg).toContain('.area-green .shape { filter: url(#area-green); }');
  });
});
