import { describe, expect, it } from 'vitest';
import type { Arrangement } from '../src/layered/arrange.js';
import type { RailSide } from '../src/layered/rail-order.js';
import { sideChoices } from '../src/layered/rail-sides.js';
import type { LayeredSpec } from '../src/layered/spec.js';

const FRAMED = { frames: [{ id: 'f', members: [] }] } as unknown as LayeredSpec;
const both: RailSide[] = ['left', 'right'];
const arranged = (rails: [string, RailSide[]][]) => ({ rails: new Map(rails) }) as unknown as Arrangement;
const pins = (a: readonly Arrangement[]) => a.map((x) => [...(x.rails ?? [])].map(([id, s]) => `${id}:${s.join('|')}`));

describe('the sides tried for rails that may take either', () => {
  it('are every combination of two free rails but the one the rail stage chose', () => {
    const first = arranged([
      ['a', both],
      ['b', both],
      ['c', ['left']],
    ]);
    expect(pins(sideChoices(FRAMED, first, () => 'left'))).toEqual([
      ['a:right', 'b:left', 'c:left'],
      ['a:left', 'b:right', 'c:left'],
      ['a:right', 'b:right', 'c:left'],
    ]);
  });

  it('flip one rail at a time to the side it did not take beyond two', () => {
    const first = arranged([
      ['a', both],
      ['b', both],
      ['c', both],
    ]);
    expect(pins(sideChoices(FRAMED, first, (id) => (id === 'b' ? 'right' : 'left')))).toEqual([
      ['a:right', 'b:left|right', 'c:left|right'],
      ['a:left|right', 'b:left', 'c:left|right'],
      ['a:left|right', 'b:left|right', 'c:right'],
    ]);
  });

  it('are none in a picture without frames and lanes, where the rail stage knows all a side passes', () => {
    expect(sideChoices({} as LayeredSpec, arranged([['a', both]]), () => 'left')).toEqual([]);
  });
});
