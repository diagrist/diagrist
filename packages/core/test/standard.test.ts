import { describe, expect, it } from 'vitest';
import { COLORS, compile, definePlugin, rule, standardStyles, textRule } from '../src/index.js';
import { linesPlugin } from './fixture.js';

const [lines] = linesPlugin.kinds;

/** The fixture kind drawn in the standard look, with one rule of its own. */
const standard = definePlugin({
  ...linesPlugin,
  kinds: lines
    ? [
        {
          ...lines,
          layout: (model, context) => ({
            ...lines.layout(model, context),
            styles: standardStyles({
              roles: { line: { classes: ['text'] } },
              rules: [rule('text', textRule('fill: #000;', { size: 9 }))],
              fonts: { body: { size: 9 } },
            }),
          }),
        },
      ]
    : [],
});

const source = 'diagram lines "x"\nline "a"';

describe('the standard look', () => {
  it('writes the base rules and arrowheads of every kind, then the rules of the kind', () => {
    const svg = compile(source, { plugins: [standard] }).svg ?? '';
    expect(svg).toContain(`.dia .line { fill: none; stroke: ${COLORS.stroke}; stroke-width: 1.5; }`);
    expect(svg).toContain('<marker id="m-filled-accent"');
    expect(svg).toContain(`fill="${COLORS.canvas}"`);
    expect(svg.indexOf('.dia .mark-text {')).toBeLessThan(svg.indexOf('.dia .text { fill: #000; font-size: 9px; }'));
  });

  it('is what a theme overlays: a base rule is repainted in place, for every kind that uses the look', () => {
    const svg =
      compile(source, {
        plugins: [standard],
        theme: { rules: [{ name: 'line', declarations: 'stroke: #c00;' }], canvas: '#000' },
      }).svg ?? '';
    expect(svg).toContain('.dia .line { stroke: #c00; }');
    expect(svg.indexOf('.dia .line {')).toBeLessThan(svg.indexOf('.dia .line-accent {'));
    expect(svg).toContain('fill="#000"');
  });
});
