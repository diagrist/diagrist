import { describe, expect, it } from 'vitest';
import { matrix } from './compile.js';

const RACI = [
  'col kunde "Kunde"',
  'col station "Stationsteam mit langem Namen"',
  'row a "A"',
  '  kunde R',
  '  station A',
];

/** The texts of a compiled picture, in drawing order. */
const texts = (svg: string | undefined): string[] =>
  [...(svg ?? '').matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1] ?? '');

describe('matrix layout', () => {
  it('lists the values the cells use and those with a rule in the legend, not the unused rest', () => {
    const shown = texts(matrix('scale=raci locale=en', ...RACI).svg);
    expect(shown).toContain('responsible, at least one per row');
    expect(shown).toContain('accountable, exactly one per row');
    expect(shown).not.toContain('consulted');
    expect(shown).not.toContain('informed');
  });

  it('writes several letters of one cell as one text in the order of the scale', () => {
    const shown = texts(matrix('scale=raci', 'col kunde "Kunde"', 'row a "A"', '  kunde A,R').svg);
    expect(shown).toContain('R/A');
  });

  it('draws cover values as discs, not as letters', () => {
    const svg = matrix('scale=cover', 'col app "App"', 'row a "A"', '  app part').svg ?? '';
    expect(texts(svg)).not.toContain('part');
    expect(svg).toMatch(/<circle[^>]*class="mark-ring"/);
    expect(svg).toMatch(/<path[^>]*class="mark-full"/);
  });

  it('gives every column the same width, however long its head', () => {
    const anchors = matrix('scale=raci', ...RACI).anchors;
    const widths = (anchors?.nodes ?? []).filter((n) => n.id === 'kunde' || n.id === 'station').map((n) => n.rect.w);
    expect(widths).toHaveLength(2);
    expect(widths[0]).toBe(widths[1]);
  });

  it('stands a band above the first row of its group, as a group of the anchors', () => {
    const anchors = matrix(
      'scale=raci',
      'col kunde "Kunde"',
      'group g "Vorgang"',
      'row a "A" in g',
      '  kunde R,A',
    ).anchors;
    const band = anchors?.groups.find((g) => g.id === 'g');
    const row = anchors?.nodes.find((n) => n.id === 'a');
    expect(band && row && band.rect.y + band.rect.h).toBe(row?.rect.y);
  });
});
