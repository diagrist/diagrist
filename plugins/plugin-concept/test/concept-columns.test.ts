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
  'link mindert "mindert" back="gemindert durch" from=kontrolle to=risiko',
  'link verantwortet "verantwortet" back="verantwortet von" from=rolle to=kontrolle',
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

  it('fork from one item to two on a shared trunk, and join two into one the same way', () => {
    const result = concept('locale=de', ...CONTROLS);
    const forks = (result.anchors?.edges ?? []).filter((e) => e.from === 'antrag');
    expect(forks.map((e) => e.points[0])).toEqual([forks[0]?.points[0], forks[0]?.points[0]]);
    const joins = (result.anchors?.edges ?? []).filter((e) => e.from === 'marktfolge');
    expect(joins.map((e) => e.points.at(-1))).toEqual([joins[0]?.points.at(-1), joins[0]?.points.at(-1)]);
  });

  it('read from left to right: a link with back= runs the other way and says it backwards', () => {
    const result = concept('locale=de', ...CONTROLS);
    for (const edge of result.anchors?.edges ?? []) {
      const [first, last] = [edge.points[0]?.[0] ?? 0, edge.points.at(-1)?.[0] ?? 0];
      expect(last).toBeGreaterThan(first);
    }
    const ahead = concept('locale=de', ...CONTROLS.map((l) => l.replace(/ back="[^"]*"/, '')));
    const scoring = ahead.anchors?.edges.find((e) => e.from === 'scoring');
    expect(scoring?.points.at(-1)?.[0]).toBeLessThan(scoring?.points[0]?.[0] ?? 0);
  });

  it('say a verb all lines between two columns share once between their heads, not on every line', () => {
    const result = concept('locale=de', ...CONTROLS);
    for (const verb of ['birgt', 'gemindert durch', 'verantwortet von'])
      expect(result.svg?.match(new RegExp(`>${verb}<`, 'g'))).toHaveLength(1);
    const own = concept('locale=de', ...CONTROLS, 'rel auszahlung birgt ausfall "selten"');
    expect(own.svg).toContain('>selten<');
    expect(own.svg?.match(/>birgt</g)).toHaveLength(1);
  });

  it('make the items of a column as wide as its widest', () => {
    const result = concept('locale=de', ...CONTROLS);
    expect(rectOf(result, 'ausfall').w).toBe(rectOf(result, 'konto').w);
    expect(rectOf(result, 'berater').w).toBe(rectOf(result, 'marktfolge').w);
  });

  it('leave out of the legend what the heads and the lines say, and stand in layers when asked to', () => {
    expect(concept('locale=de', ...CONTROLS).svg).not.toContain('class="legend"');
    const layered = concept('arrange=layers locale=de', ...CONTROLS);
    expect(layered.svg).toContain('class="legend"');
    expect(rectOf(layered, 'berater').y).toBeLessThan(rectOf(layered, 'abgleich').y);
  });

  it('lead each row with the bare text of the first column, and give the other columns a pale tint by type', () => {
    const result = concept('locale=de', ...CONTROLS);
    expect(result.svg).toContain('g-lead');
    expect(result.svg).not.toContain('g-card-blue');
    expect(result.svg).toContain('g-card-amber');
    expect(result.svg).toContain('g-card-teal');
    const own = concept('locale=de', ...CONTROLS.with(1, 'type risiko "Risiko" tone=plum'));
    expect(own.svg).toContain('g-card-plum');
    const layered = concept('arrange=layers locale=de', ...CONTROLS);
    expect(layered.svg).not.toContain('g-card-');
    expect(layered.svg).not.toContain('g-lead');
  });

  it('stand the rows of one item of the first column close, and part them from the rows of the next', () => {
    const result = concept('locale=de', ...CONTROLS);
    const [a, b, c] = ['betrug', 'ausfall', 'konto'].map((id) => rectOf(result, id));
    const within = (b?.y ?? 0) - ((a?.y ?? 0) + (a?.h ?? 0));
    const apart = (c?.y ?? 0) - ((b?.y ?? 0) + (b?.h ?? 0));
    expect(apart).toBeGreaterThan(2 * within);
  });
});
