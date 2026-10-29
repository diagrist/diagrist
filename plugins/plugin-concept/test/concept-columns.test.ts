import type { Compilation } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { concept } from './compile.js';

const rectOf = (result: Compilation, id: string) => {
  const rect = result.anchors?.nodes.find((n) => n.id === id)?.rect;
  if (rect === undefined) throw new Error(`no node ${id}`);
  return rect;
};

const middle = (r: { y: number; h: number }) => r.y + r.h / 2;

/** Tasks in two processes, their risks and controls: four types, so the picture stands in columns. */
const CONTROLS = [
  'type prozess "Prozess" shape=round',
  'type risiko "Risiko"',
  'type kontrolle "Kontrolle" shape=doc',
  'type rolle "Rolle" shape=person',
  'link birgt "birgt" from=prozess to=risiko',
  'link mindert "mindert" from=kontrolle to=risiko',
  'link verantwortet "verantwortet" from=rolle to=kontrolle',
  'item antrag "Antrag prüfen" is prozess',
  'item auszahlung "Auszahlen" is prozess',
  'item ausfall "Ausfall" is risiko',
  'item betrug "Betrug" is risiko',
  'item konto "Falsches Konto" is risiko',
  'item scoring "Scoring" is kontrolle',
  'item abgleich "Abgleich" is kontrolle',
  'item freigabe "Freigabe" is kontrolle',
  'item berater "Berater" is rolle',
  'item marktfolge "Marktfolge" is rolle',
  'rel antrag birgt ausfall',
  'rel antrag birgt betrug',
  'rel auszahlung birgt konto',
  'rel scoring mindert ausfall',
  'rel abgleich mindert betrug',
  'rel freigabe mindert konto',
  'rel berater verantwortet abgleich',
  'rel marktfolge verantwortet scoring',
  'rel marktfolge verantwortet freigabe',
];

describe('concept pictures in columns', () => {
  it('stand in a column per type, in the order of the declarations, with the type as the head', () => {
    const result = concept('locale=de', ...CONTROLS);
    const xs = ['antrag', 'ausfall', 'scoring', 'berater'].map((id) => rectOf(result, id).x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    for (const head of ['Prozess', 'Risiko', 'Kontrolle', 'Rolle']) expect(result.svg).toContain(`>${head}<`);
    expect(result.diagnostics).toEqual([]);
  });

  it('put related items level, an item with two partners between them, and the first column in source order', () => {
    const result = concept('locale=de', ...CONTROLS);
    for (const [a, b] of [
      ['ausfall', 'scoring'],
      ['betrug', 'abgleich'],
      ['konto', 'freigabe'],
      ['abgleich', 'berater'],
    ] as const)
      expect(middle(rectOf(result, a))).toBe(middle(rectOf(result, b)));
    const between = (id: string, x: string, y: string) =>
      expect(middle(rectOf(result, id))).toBeCloseTo((middle(rectOf(result, x)) + middle(rectOf(result, y))) / 2);
    between('antrag', 'ausfall', 'betrug');
    between('marktfolge', 'scoring', 'freigabe');
    expect(rectOf(result, 'antrag').y).toBeLessThan(rectOf(result, 'auszahlung').y);
  });

  it('fork from one item to two on a shared trunk that carries the text once', () => {
    const result = concept('locale=de', ...CONTROLS);
    const forks = (result.anchors?.edges ?? []).filter((e) => e.from === 'antrag');
    expect(forks.map((e) => e.points[0])).toEqual([forks[0]?.points[0], forks[0]?.points[0]]);
    expect(result.svg?.match(/>birgt</g)).toHaveLength(2);
  });

  it('leave out of the legend what the heads and the lines say, and stand in layers when asked to', () => {
    expect(concept('locale=de', ...CONTROLS).svg).not.toContain('class="legend"');
    const layered = concept('arrange=layers locale=de', ...CONTROLS);
    expect(layered.svg).toContain('class="legend"');
    expect(rectOf(layered, 'berater').y).toBeLessThan(rectOf(layered, 'abgleich').y);
  });
});
