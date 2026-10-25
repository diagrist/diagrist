import { kind, statement } from '@diagrist/lang';
import { describe, expect, it } from 'vitest';
import {
  compile,
  defineKind,
  definePlugin,
  runsWidth,
  type Shape,
  type Styles,
  type TextRun,
  textWidth,
  toSvg,
} from '../src/index.js';
import { styles } from './fixture.js';

const coded: Styles = {
  ...styles,
  roles: { ...styles.roles, keyword: { classes: ['kw'] } },
  rules: [...styles.rules, { name: 'kw', declarations: 'fill: #a00;' }],
};

const line = (text: string, runs?: readonly TextRun[]): Shape => ({
  kind: 'text',
  x: 2,
  y: 10,
  text,
  role: 'line',
  font: 'body',
  ...(runs === undefined ? {} : { runs }),
});

const svgOf = (...children: Shape[]) => toSvg({ width: 90, height: 20, title: 'Code', children }, coded);

describe('text runs', () => {
  it('are written as tspans in the classes of their role, a run without role as plain text', () => {
    const svg = svgOf(line('if (a < b)', [{ text: 'if', role: 'keyword' }, { text: ' (a < b)' }]));
    expect(svg).toContain('<text x="2" y="10" class="text"><tspan class="kw">if</tspan> (a &lt; b)</text>');
    expect(svg).toContain('.dia .kw { fill: #a00; }');
  });

  it('keep their spaces only where SVG would strip or collapse them', () => {
    const indented = svgOf(
      line('    return  x;', [{ text: '    ' }, { text: 'return', role: 'keyword' }, { text: '  x;' }]),
    );
    expect(indented).toContain('<text x="2" y="10" xml:space="preserve" class="text">    <tspan class="kw">return');
    const plain = svgOf(line('return x;', [{ text: 'return', role: 'keyword' }, { text: ' x;' }]));
    expect(plain).not.toContain('xml:space');
  });

  it('leave a text without runs as it was, its spaces included', () => {
    expect(svgOf(line('  two  spaces'))).toContain('<text x="2" y="10" class="text">  two  spaces</text>');
  });

  it('are measured in one sum over all parts, so one part is as wide as textWidth says', () => {
    const body = coded.fonts.body ?? { size: 11 };
    expect(runsWidth([{ text: 'public void run()', font: body }])).toBe(textWidth('public void run()', body));
    expect(runsWidth([{ text: 'Mix', font: { size: 13, family: 'inter' } }])).toBe(
      textWidth('Mix', { size: 13, family: 'inter' }),
    );
    const regular = { size: 20, family: 'inter' as const };
    const parts = runsWidth([
      { text: 'WWWW', font: { ...regular, weight: 700 } },
      { text: 'WWWW', font: regular },
    ]);
    expect(parts).toBeGreaterThan(textWidth('WWWWWWWW', regular));
  });
});

describe('a text whose runs say another line', () => {
  const said = statement('say', { doc: 'Says something.', examples: ['say'] });
  const split = defineKind({
    spec: kind('split', { doc: 'A text split wrongly.', statements: [said] }),
    model: () => ({}),
    rules: [],
    layout: () => ({
      scene: { width: 90, height: 20, title: 'Split', children: [line('return x;', [{ text: 'return' }])] },
      styles: coded,
      anchors: { width: 90, height: 20, nodes: [], groups: [], edges: [] },
    }),
    describe: () => 'A line.',
  });

  it('stops the picture with K104, since it would show another line than the one placed and described', () => {
    const plugin = definePlugin({ name: 'split', kinds: [split], messages: {} });
    const result = compile('diagram split "S"\nsay\n', { plugins: [plugin] });
    expect(result.svg).toBeUndefined();
    expect(result.diagnostics).toMatchObject([{ code: 'K104', values: { text: 'return x;', runs: 'return' } }]);
  });
});
