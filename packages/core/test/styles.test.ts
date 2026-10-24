import { describe, expect, it } from 'vitest';
import { compile, definePlugin, MARKER_SHAPES, type Scene, type Styles, toSvg } from '../src/index.js';
import { linesPlugin, styles } from './fixture.js';

const scene = (...children: Scene['children']): Scene => ({ width: 40, height: 40, title: 'T', children });

describe('markers', () => {
  const uml: Styles = {
    ...styles,
    markers: [
      { id: 'whole', shape: MARKER_SHAPES.diamond, name: 'diamond' },
      { id: 'general', shape: MARKER_SHAPES.triangle, name: 'hollow' },
    ],
    roles: { composition: { classes: ['stroke'], marker: 'general', markerStart: 'whole' } },
  };

  it('are outlines as data, so a plugin draws diamonds and hollow heads at either end without a kernel change', () => {
    const svg = toSvg(scene({ kind: 'path', d: 'M0 0 L9 9', role: 'composition' }), uml);
    expect(svg).toContain('marker-end="url(#m-general)" marker-start="url(#m-whole)"/>');
    expect(svg).toContain('<path d="M1 6 L6 2.5 L11 6 L6 9.5 Z" class="diamond" stroke-linecap="round"/>');
    expect(svg).toContain('<path d="M1 1 L11 6 L1 11 Z" class="hollow" stroke-linecap="round"/>');
  });
});

describe('icons', () => {
  const withIcon: Styles = {
    ...styles,
    icons: { server: { size: 24, paths: ['M2 2h20v8H2z', 'M2 14h20v8H2z'] } },
    roles: { ...styles.roles, symbol: { classes: ['stroke'] } },
  };

  it('are drawn from the style table into their square, with the classes of their role', () => {
    const svg = toSvg(scene({ kind: 'icon', icon: 'server', x: 4, y: 5.25, size: 16, role: 'symbol' }), withIcon);
    expect(svg).toContain(
      '<svg x="4" y="5.3" width="16" height="16" viewBox="0 0 24 24" class="stroke"><path d="M2 2h20v8H2z"/><path d="M2 14h20v8H2z"/></svg>',
    );
    expect(svg).toContain('.dia .stroke {');
  });

  it('that the style table lacks stop the picture with K102 instead of vanishing', () => {
    const [kind] = linesPlugin.kinds;
    if (kind === undefined) return;
    const iconic = definePlugin({
      ...linesPlugin,
      kinds: [
        {
          ...kind,
          layout: () => ({
            scene: scene({ kind: 'icon', icon: 'cloud', x: 0, y: 0, size: 8, role: 'line' }),
            styles: withIcon,
            anchors: { width: 40, height: 40, nodes: [], groups: [], edges: [] },
          }),
        },
      ],
    });
    const result = compile('diagram lines "x"\nline "a"', { plugins: [iconic] });
    expect(result.diagnostics).toMatchObject([{ code: 'K102', values: { icon: 'cloud', known: '`server`' } }]);
    expect(result.svg).toBeUndefined();
  });
});

describe('a theme', () => {
  const source = 'diagram lines "x"\nline "a"';

  it('repaints roles and rules of any kind without touching the plugin, and keeps the geometry', () => {
    const plain = compile(source, { plugins: [linesPlugin] }).svg ?? '';
    const branded = compile(source, {
      plugins: [linesPlugin],
      theme: {
        canvas: '#002b5c',
        roles: { line: { classes: ['brand'] } },
        rules: [
          { name: 'text', declarations: 'fill: #ffffff;' },
          { name: 'brand', declarations: 'fill: #ffcc00;' },
        ],
      },
    }).svg;
    expect(branded).toContain('fill="#002b5c"');
    expect(branded).toContain('class="brand">a</text>');
    expect(branded).toContain('.dia .brand { fill: #ffcc00; }');
    expect(branded).not.toContain('.dia .text {');
    const geometry = (svg: string) => svg.match(/ (x|y|width|height)="[^"]*"/g);
    expect(geometry(branded ?? '')).toEqual(geometry(plain));
  });

  it('replaces a rule of the same name in place and adds new markers after the old ones', () => {
    const svg = compile(source, {
      plugins: [linesPlugin],
      theme: {
        rules: [{ name: 'base', declarations: 'fill: red;' }],
        markers: [{ id: 'whole', shape: MARKER_SHAPES.diamond, name: 'diamond' }],
      },
    }).svg;
    expect(svg).toContain('.dia .base { fill: red; }');
    expect(svg).toMatch(/<marker id="m-open".*<marker id="m-whole"/);
  });
});
