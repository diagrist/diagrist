import { compile } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';

const picture = (header: string) =>
  compile(
    [
      `diagram state "Test" ${header}`.trimEnd(),
      'area kern "Kern"',
      'area zahlung "Zahlungen" tone=green',
      'area versand "Versand" tone=orange',
      'initial start',
      'state angelegt "Angelegt" area=kern',
      'state zahlen "Zahlen" area=zahlung',
      'state offen "offen" in zahlen',
      'state bezahlt "bezahlt" in zahlen',
      'state liefern "Liefern"',
      'region paket "Paket" in liefern area=versand',
      'state gepackt "gepackt" in paket',
      'final ende',
      'go start -> angelegt',
      'go angelegt -> offen on="bestellen"',
      'go offen -> bezahlt on="zahlen"',
      'go bezahlt -> gepackt',
      'go gepackt -> ende',
    ].join('\n'),
    { plugins: [umlPlugin] },
  );

describe('areas in state machine diagrams', () => {
  const plain = picture('locale=de');

  it('mark states, the substates of a composite state and its frame, and leave the core in ink', () => {
    expect(plain.diagnostics.filter((d) => d.severity !== 'warning')).toEqual([]);
    expect(plain.svg).toContain('<g id="node-offen" class="area-green">');
    expect(plain.svg).toContain('<g id="group-zahlen" class="area-green-line">');
    expect(plain.svg).toContain('<g id="node-angelegt">');
    expect(plain.svg).toContain('<g id="node-start">');
  });

  it('pass the area of a region to its states, while its composite state stays in ink', () => {
    expect(plain.svg).toContain('<g id="node-gepackt" class="area-orange">');
    expect(plain.svg).toContain('<g id="group-liefern">');
  });

  it('give a transition from the core into an extension the tone of the extension, label included', () => {
    expect(plain.svg).toContain('<g id="edge-1" class="area-green-line">');
    expect(plain.svg).toContain('<g id="label-1" class="area-green-line">');
    expect(plain.svg).toContain('<g id="edge-0">');
  });

  it('append a legend of the areas and name their states in the description', () => {
    expect(plain.svg).toContain('>Zahlungen</text>');
    expect(plain.svg).toContain('>Kern</text>');
    expect(plain.description).toContain('Bereich Zahlungen (grün): Zahlen, offen, bezahlt.');
    expect(plain.description).toContain('Bereich Versand (orange): gepackt.');
  });

  it('keep a picture without areas as it was, without a legend', () => {
    const none = compile('diagram state "Test"\ninitial s\nstate a "A"\ngo s -> a', { plugins: [umlPlugin] });
    expect(none.svg).not.toContain('area-');
    expect(none.svg).not.toContain('class="legend"');
  });
});
