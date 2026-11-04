import { describe, expect, it } from 'vitest';
import { type AreaPaint, lineArea, readAreas, type Scene, type Shape, standardStyles, toSvg } from '../src/index.js';

const styles = standardStyles({
  roles: {
    item: { classes: ['shape'] },
    name: { classes: ['label-bold'] },
    edge: { classes: ['line'], marker: 'filled' },
  },
  rules: [],
});

const body: Shape = {
  kind: 'group',
  area: { tone: 'green', as: 'body' },
  children: [
    { kind: 'rect', x: 10, y: 10, w: 80, h: 30, role: 'item' },
    { kind: 'text', x: 20, y: 30, text: 'Tarif', role: 'name', font: 'name' },
  ],
};

const line: Shape = {
  kind: 'group',
  area: { tone: 'orange', as: 'line' },
  children: [{ kind: 'path', d: 'M 0 0 L 9 9', role: 'edge' }],
};

const svgOf = (areas: AreaPaint, ...children: Shape[]): string => {
  const scene: Scene = { width: 100, height: 50, title: 'T', areas, children };
  return toSvg(scene, styles);
};

describe('areas in the SVG', () => {
  it('tint: the outline in the ink, the fill in the tint, the name left in black', () => {
    const svg = svgOf('tint', body);
    expect(svg).toContain('<g class="area-green">');
    expect(svg).toContain('.dia .area-green .shape { fill: #dcfce7; stroke: #15803d; }');
    expect(svg).not.toContain('.area-green .label-bold');
  });

  it('outline: the outline and the name in the ink, the fill left white', () => {
    const svg = svgOf('outline', body);
    expect(svg).toContain('.dia .area-green .shape { stroke: #15803d; }');
    expect(svg).toContain('.dia .area-green .label-bold { fill: #15803d; }');
  });

  it('stripe: a filter that keeps the band inside the outline, so the edge and the arrowheads on it stay put', () => {
    const svg = svgOf('stripe', body);
    expect(svg).toContain('.dia .area-green .shape { filter: url(#area-green); }');
    expect(svg).toContain('<filter id="area-green"');
    expect(svg).toContain('operator="out"');
    expect(svg).not.toContain('feDropShadow');
    expect(svg).not.toContain('.area-green .label-bold');
  });

  it('lines take the ink in every paint, with an arrowhead of their own in it', () => {
    for (const paint of ['tint', 'outline', 'stripe'] as const) {
      const svg = svgOf(paint, line);
      expect(svg).toContain('<path d="M 0 0 L 9 9" class="line" marker-end="url(#m-filled-orange)"/>');
      expect(svg).toContain('<marker id="m-filled-orange" class="area-orange-line"');
      expect(svg).toContain('.dia .area-orange-line .line { stroke: #c2410c; }');
      expect(svg).toContain('.dia .area-orange-line .arrow-filled { fill: #c2410c; }');
    }
  });

  it('a scene without areas has no area rules, markers or filters', () => {
    const svg = svgOf('stripe', { kind: 'rect', x: 0, y: 0, w: 9, h: 9, role: 'item' });
    expect(svg).not.toContain('area-');
  });
});

describe('the area of a line', () => {
  const areas = readAreas([
    { keyword: 'area', id: 'kern', label: 'Kern' },
    { keyword: 'area', id: 'zahlung', label: 'Zahlungen', attributes: { tone: 'green' } },
    { keyword: 'area', id: 'wartung', label: 'Wartung', attributes: { tone: 'orange' } },
  ]);

  it('is its own when it names one', () => {
    expect(lineArea(areas, 'wartung', 'zahlung', 'kern')).toBe('wartung');
  });

  it('is the coloured area of its first end, else of its second, so a line to the core belongs to the extension', () => {
    expect(lineArea(areas, undefined, 'zahlung', 'wartung')).toBe('zahlung');
    expect(lineArea(areas, undefined, 'kern', 'zahlung')).toBe('zahlung');
    expect(lineArea(areas, undefined, 'kern', undefined)).toBeUndefined();
  });

  it('reads the paint of the header, `tint` by default', () => {
    expect(areas.paint).toBe('tint');
    expect(readAreas([], { areas: 'stripe' }).paint).toBe('stripe');
  });
});
