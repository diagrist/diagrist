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
    expect(svg).toContain('.dia .area-green .label-bold { fill: #18181b; }');
  });

  it('outline: the outline and the name in the ink, the fill left white', () => {
    const svg = svgOf('outline', body);
    expect(svg).toContain('.dia .area-green .shape { fill: #ffffff; stroke: #15803d; }');
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
      expect(svg).toContain('.dia .area-orange-line .line { fill: none; stroke: #c2410c; }');
      expect(svg).toContain('.dia .area-orange-line .arrow-filled { fill: #c2410c; stroke: none; }');
    }
  });

  it('repaint the arrowheads of a look that writes only used rules, which SVG draws in its black fill', () => {
    const usedOnly = { ...styles, rules: styles.rules.map(({ name, declarations }) => ({ name, declarations })) };
    const scene: Scene = { width: 100, height: 50, title: 'T', children: [line] };
    const svg = toSvg(scene, usedOnly);
    expect(svg).not.toContain('.dia .arrow-filled {');
    expect(svg).toContain('.dia .area-orange-line .arrow-filled { fill: #c2410c; }');
  });

  it('keep the cascade of a shape with two classes: a halo under a line keeps the canvas, not the tone', () => {
    const haloed: Shape = { ...line, children: [{ kind: 'path', d: 'M 0 0 L 9 9', role: 'haloed' }] };
    const withHalo = { ...styles, roles: { ...styles.roles, haloed: { classes: ['line', 'halo'] } } };
    const svg = toSvg({ width: 100, height: 50, title: 'T', children: [haloed] }, withHalo);
    const inked = svg.indexOf('.dia .area-orange-line .line {');
    const halo = svg.indexOf('.dia .area-orange-line .halo { stroke: #fafafa; }');
    expect(inked).toBeGreaterThan(0);
    expect(halo).toBeGreaterThan(inked);
  });

  it('never stripe or tint a text, even one filled white like a name on a card head, nor stripe a line', () => {
    const card = standardStyles({
      roles: { head: { classes: ['head-text'] }, limb: { classes: ['limb'] } },
      rules: [
        { name: 'head-text', declarations: 'fill: #ffffff;' },
        { name: 'limb', declarations: 'fill: #ffffff; stroke: #18181b;' },
      ],
    });
    const drawn: Shape = {
      kind: 'group',
      area: { tone: 'green', as: 'body' },
      children: [
        { kind: 'text', x: 0, y: 9, text: 'Alpha', role: 'head', font: 'name' },
        { kind: 'line', x1: 5, y1: 0, x2: 5, y2: 9, role: 'limb' },
      ],
    };
    for (const areas of ['tint', 'stripe'] as const) {
      const svg = toSvg({ width: 100, height: 50, title: 'T', areas, children: [drawn] }, card);
      expect(svg).not.toMatch(/\.area-green \.head-text \{[^}]*(#dcfce7|filter)/);
      expect(svg).not.toContain('filter: url(#area-green)');
    }
  });

  it('tint fills what is filled in ink, such as the dot of an initial state, but keeps the texts black', () => {
    const dot = standardStyles({
      roles: { dot: { classes: ['dot'] } },
      rules: [{ name: 'dot', declarations: 'fill: #18181b;' }],
    });
    const drawn: Shape = {
      kind: 'group',
      area: { tone: 'green', as: 'body' },
      children: [{ kind: 'circle', cx: 5, cy: 5, r: 4, role: 'dot' }],
    };
    expect(toSvg({ width: 9, height: 9, title: 'T', children: [drawn] }, dot)).toContain(
      '.dia .area-green .dot { fill: #15803d; }',
    );
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
