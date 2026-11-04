import { compile } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';

const picture = (header: string) =>
  compile(
    [
      `diagram usecase "Test" ${header}`.trimEnd(),
      'area kern "Kern"',
      'area zahlung "Zahlungen" tone=green',
      'area gutschein "Gutscheine" tone=purple',
      'subject shop "Shop" area=kern',
      'subject pay "Zahlung" area=zahlung',
      'actor kunde "Kunde" area=kern',
      'usecase bestellen "Bestellen" in shop points="vor Kasse"',
      'usecase zahlen "Bezahlen" in pay',
      'usecase einloesen "Gutschein einlösen" in shop area=gutschein tone=red',
      'rel kunde -- bestellen',
      'rel bestellen --> zahlen include',
      'rel einloesen --> bestellen extend when="Gutschein da" at="vor Kasse"',
    ].join('\n'),
    { plugins: [umlPlugin] },
  );

describe('areas in use case diagrams', () => {
  const plain = picture('locale=de');

  it('mark use cases and actors, the use cases of a subject and its frame, and leave the core in ink', () => {
    expect(plain.diagnostics.filter((d) => d.severity !== 'warning')).toEqual([]);
    expect(plain.svg).toContain('<g id="node-einloesen" class="area-purple">');
    expect(plain.svg).toContain('<g id="node-zahlen" class="area-green">');
    expect(plain.svg).toContain('<g id="group-pay" class="area-green-line">');
    expect(plain.svg).toContain('<g id="node-kunde">');
    expect(plain.svg).toContain('<g id="group-shop">');
  });

  it('give a line from the core into an extension the tone of the extension, its labels and extend note too', () => {
    expect(plain.svg).toContain('<g id="edge-1" class="area-green-line">');
    expect(plain.svg).toContain('<g id="edge-2" class="area-purple-line">');
    expect(plain.svg).toContain('<g id="label-2" class="area-purple-line">');
    expect(plain.svg).toContain('<g class="area-purple-line"><line');
    expect(plain.svg).toContain('<g id="edge-0">');
  });

  it('keep the tone of the card look apart from the area', () => {
    const cards = picture('look=cards locale=de');
    expect(cards.svg).toMatch(/<g id="node-einloesen" class="area-purple"><path [^>]*class="card-shadow"/);
    expect(cards.svg).toContain('class="outline-red"');
  });

  it('append a legend of the areas and name their actors and use cases in the description', () => {
    expect(plain.svg).toContain('>Gutscheine</text>');
    expect(plain.svg).toContain('>Kern</text>');
    expect(plain.description).toContain('Bereich Zahlungen (grün): Bezahlen.');
    expect(plain.description).toContain('Bereich Kern (schwarz): Kunde, Bestellen.');
  });

  it('keep a picture without areas as it was, without a legend', () => {
    const none = compile('diagram usecase "Test"\nactor a "A"\nusecase u "U"\nrel a -- u', { plugins: [umlPlugin] });
    expect(none.svg).not.toContain('area-');
    expect(none.svg).not.toContain('class="legend"');
  });
});
