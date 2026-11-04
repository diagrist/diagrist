import { formatMessage } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { codes, concept, plugins } from './compile.js';

const BASE = [
  'type modul "Modul"',
  'link nutzt "nutzt" from=modul to=modul',
  'area kern "Kern"',
  'area zahlung "Zahlungen" tone=green',
];

/** The kernel's findings about areas, as an agent reads them in English. */
const messages = (header: string, ...lines: string[]): string[] =>
  concept(header, ...lines)
    .diagnostics.filter((d) => d.code.startsWith('K'))
    .map((d) => formatMessage(d, plugins));

describe('areas of a concept picture', () => {
  const result = concept(
    'areas=outline locale=de',
    ...BASE,
    'item api "API" is modul area=kern',
    'item tarif "Tarifrechner" is modul area=zahlung',
    'rel tarif nutzt api',
  );

  it('paint the item of a coloured area and the line from it, and leave the core in ink', () => {
    expect(codes(result)).toEqual([]);
    expect(result.svg).toContain('<g id="node-tarif" class="area-green">');
    expect(result.svg).toContain('<g id="node-api">');
    expect(result.svg).toContain('<g id="edge-0" class="area-green-line">');
    expect(result.svg).toContain('.dia .area-green .label-bold { fill: #15803d; }');
  });

  it('name each area in the legend and in the description', () => {
    expect(result.svg).toContain('>Zahlungen</text>');
    expect(result.svg).toContain('>Kern</text>');
    expect(result.description).toContain('Bereich Zahlungen (grün): Tarifrechner.');
    expect(result.description).toContain('Bereich Kern (schwarz): API.');
  });

  it('L107: `area=` names a declared area', () => {
    const found = codes(concept('', ...BASE, 'item a "A" is modul area=kern', 'item b "B" is modul area=zahlungen'));
    expect(found).toContain('L107');
  });

  it('K105: an area nothing joins is a warning', () => {
    expect(messages('', ...BASE, 'item a "A" is modul area=kern')).toEqual([
      'Nothing joins the area `zahlung`, so the legend would name a colour the picture does not use. Give elements, frames or lines `area=zahlung`, or remove the line.',
    ]);
  });

  it('K107: two areas of one tone cannot be told apart', () => {
    const lines = [...BASE, 'area wartung "Wartung" tone=green', 'item a "A" is modul area=zahlung'];
    expect(messages('', ...lines, 'item b "B" is modul area=wartung', 'item c "C" is modul area=kern')).toEqual([
      'The areas `zahlung` and `wartung` share the tone `green`, so the picture cannot tell them apart. Give `wartung` another tone.',
    ]);
  });

  it('K106: more than six coloured areas are a warning at the seventh', () => {
    const tones = ['green', 'orange', 'purple', 'red', 'yellow', 'teal', 'pink'];
    const lines = tones.flatMap((t) => [`area ${t}x "${t}" tone=${t}`, `item ${t}i "${t}" is modul area=${t}x`]);
    expect(codes(concept('', 'type modul "Modul"', ...lines)).filter((c) => c.startsWith('K'))).toEqual(['K106']);
  });
});
