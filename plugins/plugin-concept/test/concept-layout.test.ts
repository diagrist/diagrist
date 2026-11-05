import type { Compilation } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { concept } from './compile.js';

const rectOf = (result: Compilation, id: string) => {
  const rect = result.anchors?.nodes.find((n) => n.id === id)?.rect;
  if (rect === undefined) throw new Error(`no node ${id}`);
  return rect;
};

describe('concept layout', () => {
  it('puts the second item of a relation below the first', () => {
    const result = concept(
      '',
      'type t "T"',
      'link l "führt zu" from=t to=t',
      'item a "A" is t',
      'item b "B" is t',
      'rel a l b',
    );
    expect(rectOf(result, 'b').y).toBeGreaterThan(rectOf(result, 'a').y);
    expect(result.svg).toContain('führt zu');
  });

  it('puts the broader term above the narrower, and a deputy beside the role it stands in for', () => {
    const terms = concept(
      'vocabulary=terms',
      'item rad "Rad" is term',
      '  "Fahrzeug"',
      'item ebike "E-Bike" is term',
      '  "Rad mit Motor"',
      'rel ebike is-a rad',
    );
    expect(rectOf(terms, 'rad').y).toBeLessThan(rectOf(terms, 'ebike').y);
    expect(terms.svg).not.toContain('ist ein');
    const roles = concept('vocabulary=roles', 'item a "A" is role', 'item b "B" is role', 'rel a deputy b');
    expect(rectOf(roles, 'a').y).toBe(rectOf(roles, 'b').y);
  });

  it('names in its legend only the types and links the picture uses, in the locale of the picture', () => {
    const result = concept(
      'vocabulary=terms locale=de',
      'item a "A" is term',
      '  "a"',
      'item b "B" is term',
      '  "b"',
      'rel a part-of b',
    );
    expect(result.svg).toContain('>Begriff<');
    expect(result.svg).toContain('>ist Teil von<');
    expect(result.svg).not.toContain('>ist ein<');
  });

  it('draws an item without relations, and a picture without items', () => {
    expect(concept('', 'type t "T"', 'item a "A" is t').svg).toContain('node-a');
    expect(concept('').svg).toBeDefined();
  });

  it('draws relations of one link from one item as a fan: one trunk from the middle, a branch into the middle of each', () => {
    const result = concept(
      '',
      'type t "T"',
      'link l "führt zu" from=t to=t',
      'item a "Ein langer Name für das obere Element" is t',
      'item b "B" is t',
      'item c "C" is t',
      'rel a l b',
      'rel a l c',
    );
    const [first, second] = result.anchors?.edges ?? [];
    const a = rectOf(result, 'a');
    const b = rectOf(result, 'b');
    const c = rectOf(result, 'c');
    expect(first?.points.at(-1)).toEqual([b.x + b.w / 2, b.y]);
    expect(second?.points.at(-1)).toEqual([c.x + c.w / 2, c.y]);
    expect(first?.points[0]).toEqual([a.x + a.w / 2, a.y + a.h]);
    expect(second?.points[0]).toEqual(first?.points[0]);
    expect(first?.points).toHaveLength(4);
  });

  const chain = [
    'type t "T"',
    'link feeds "liefert an" from=t to=t',
    'link reads "liest" from=t to=t',
    'item src "Quelle" is t',
    'item a "A" is t',
    'item b "B" is t',
    'item c "C" is t',
    'item user "Nutzer mit langem Namen" is t',
    'rel src feeds a',
    'rel a feeds b',
    'rel b feeds c',
    'rel user reads a',
    'rel user reads b',
  ];

  it('draws two links that would look alike with different lines and keeps their words in the legend', () => {
    const svg = concept('arrange=layers', ...chain).svg ?? '';
    const lines = [...svg.matchAll(/<path d="M[^"]*" class="([^"]*)" marker-end/g)].map((m) => m[1]);
    expect(new Set(lines).size).toBe(2);
    expect(svg.match(/>liest</g)).toHaveLength(1);
    const words = concept('arrange=layers', ...chain.map((l) => (l.startsWith('link') ? `${l} line=solid` : l)));
    expect((words.svg ?? '').match(/>liest</g)?.length).toBeGreaterThan(1);
  });

  it('sets a chain of links straight below its head, whatever lines leave it beside', () => {
    const result = concept('arrange=layers', ...chain);
    const centre = (id: string) => rectOf(result, id).x + rectOf(result, id).w / 2;
    expect([centre('b'), centre('c')]).toEqual([centre('a'), centre('a')]);
  });
});

describe('arrangement', () => {
  const extensions = [
    'type m "Modul"',
    'link uses "nutzt" from=m to=m',
    'area kern "Kern"',
    'area pay "Zahlung" tone=green',
    'area fix "Wartung" tone=orange',
    'item a "Ausleihe" is m area=kern',
    'item b "Konto" is m area=kern',
    'item p "Tarif" is m area=pay',
    'item w "Schaden" is m area=fix',
    'rel a uses b',
    'rel p uses b',
    'rel w uses a',
  ];

  it('lays out a core extended by two areas as a hub, with the core in a frame headed by its name', () => {
    const svg = concept('locale=de', ...extensions).svg ?? '';
    expect(svg).toMatch(/<rect [^>]*class="frame"/);
    expect(svg).toContain('>Kern</text>');
  });

  it('keeps layers when asked, and has no frame then', () => {
    expect(concept('arrange=layers', ...extensions).svg).not.toMatch(/<rect [^>]*class="frame"/);
  });
});
