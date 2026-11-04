import { compile } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';

const picture = (header: string) =>
  compile(
    [
      `diagram activity "Test" ${header}`.trimEnd(),
      'area kern "Kern"',
      'area zahlung "Zahlungen" tone=green',
      'partition shop "Shop" area=kern',
      'partition pay "Zahlung" area=zahlung',
      'initial start in shop',
      'action order "Bestellen" in shop',
      'decision paid "Bezahlt?" in pay',
      'action charge "Belasten"',
      'action ack "Bestaetigen" in pay area=kern',
      'final end in shop',
      'go start -> order',
      'go order -> paid',
      'go paid -> charge "nein"',
      'go paid -> ack else',
      'go charge -> end',
      'go ack -> end',
    ].join('\n'),
    { plugins: [umlPlugin] },
  );

describe('areas in activity diagrams', () => {
  const plain = picture('locale=de');

  it('mark the nodes of a lane, also one placed there without `in`, and leave the core in ink', () => {
    expect(plain.diagnostics.filter((d) => d.severity !== 'warning')).toEqual([]);
    expect(plain.svg).toContain('<g id="node-paid" class="area-green">');
    expect(plain.svg).toContain('<g id="node-charge" class="area-green">');
    expect(plain.svg).toContain('<g id="node-order">');
    expect(plain.svg).toContain('<g id="group-pay" class="area-green-line">');
    expect(plain.svg).toContain('<g id="group-shop">');
  });

  it('let a node name its own area inside a coloured lane', () => {
    expect(plain.svg).toContain('<g id="node-ack">');
  });

  it('give an edge and its guard the tone of the extension at either end, and none inside the core', () => {
    expect(plain.svg).toContain('<g id="edge-0">');
    expect(plain.svg).toContain('<g id="edge-1" class="area-green-line">');
    expect(plain.svg).toContain('<g id="label-2" class="area-green-line">');
    expect(plain.svg).toContain('<g id="edge-4" class="area-green-line">');
  });

  it('append a legend of the areas and name them with their nodes in the description', () => {
    expect(plain.svg).toContain('>Zahlungen</text>');
    expect(plain.svg).toContain('>Kern</text>');
    expect(plain.description).toMatch(/Bereich Zahlungen \(grün\): [^\n]*Belasten\./);
  });

  it('keep a picture without areas as it was, without a legend', () => {
    const none = compile('diagram activity "Test"\ninitial a\naction b "B"\ngo a -> b', { plugins: [umlPlugin] });
    expect(none.svg).not.toContain('area-');
    expect(none.svg).not.toContain('class="legend"');
  });
});
