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
              roles: { line: { classes: ['label', 'text'] } },
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
  it('writes the base rules a picture uses, then the rules of the kind, and no arrowhead without a line', () => {
    const svg = compile(source, { plugins: [standard] }).svg ?? '';
    expect(svg).toContain(`.diagrist .label { fill: ${COLORS.stroke}; font-size: 10px; }`);
    expect(svg).not.toContain('.diagrist .line {');
    expect(svg).not.toContain('<marker');
    expect(svg).toContain(`fill="${COLORS.canvas}"`);
    expect(svg.indexOf('.diagrist .label {')).toBeLessThan(
      svg.indexOf('.diagrist .text { fill: #000; font-size: 9px; }'),
    );
  });

  it('is what a theme overlays: a base rule is repainted in place, for every kind that uses the look', () => {
    const svg =
      compile(source, {
        plugins: [standard],
        theme: { rules: [{ name: 'label', declarations: 'fill: #c00;' }], canvas: '#000' },
      }).svg ?? '';
    expect(svg).toContain('.diagrist .label { fill: #c00; }');
    expect(svg.indexOf('.diagrist .label {')).toBeLessThan(svg.indexOf('.diagrist .text {'));
    expect(svg).toContain('fill="#000"');
  });

  it('draws its base rules in the measures of a variant, larger fonts and thicker lines, keeping their order', () => {
    const rules = standardStyles({
      roles: {},
      rules: [],
      measures: { fonts: { label: { size: 14 } }, strokes: { line: 3 } },
    }).rules;
    const of = (name: string) => rules.find((r) => r.name === name)?.declarations;
    expect(of('label')).toBe(`fill: ${COLORS.stroke}; font-size: 14px;`);
    expect(of('line')).toBe(`fill: none; stroke: ${COLORS.stroke}; stroke-width: 3;`);
    expect(of('arrow-open')).toBe(`fill: none; stroke: ${COLORS.stroke}; stroke-width: 3;`);
    expect(of('shape')).toBe(`fill: #ffffff; stroke: ${COLORS.stroke}; stroke-width: 1.5;`);
    expect(rules.map((r) => r.name)).toEqual(standardStyles({ roles: {}, rules: [] }).rules.map((r) => r.name));
  });
});
