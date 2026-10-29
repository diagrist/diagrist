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
});
