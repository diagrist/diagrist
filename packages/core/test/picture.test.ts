import { describe, expect, it } from 'vitest';
import { compile, rectForm, toSvg } from '../src/index.js';
import { linesPlugin } from './fixture.js';

describe('a drawn picture', () => {
  it('carries the scene and the styles its SVG was written from', () => {
    const [picture] = compile('diagram lines "x"\nline "a"\nline "b"', { plugins: [linesPlugin] }).pictures;
    expect(picture?.scene?.children.map((shape) => (shape.kind === 'text' ? shape.text : shape.kind))).toEqual([
      'a',
      'b',
    ]);
    expect(picture?.styles?.root).toBe('diagrist');
    if (picture?.scene === undefined || picture.styles === undefined) return;
    expect(toSvg(picture.scene, picture.styles)).toBe(picture.svg);
  });

  it('carries neither when the picture has an error', () => {
    const [picture] = compile('diagram lines "x"\nline', { plugins: [linesPlugin] }).pictures;
    expect(picture?.svg).toBeUndefined();
    expect(picture?.scene).toBeUndefined();
    expect(picture?.styles).toBeUndefined();
  });

  it('carries the styles with the theme laid over them', () => {
    const theme = { canvas: '#002b5c', rules: [{ name: 'text', declarations: 'fill: #ffffff;' }] };
    const [picture] = compile('diagram lines "x"\nline "a"', { plugins: [linesPlugin], theme }).pictures;
    expect(picture?.styles?.canvas).toBe('#002b5c');
    expect(picture?.styles?.rules.find((rule) => rule.name === 'text')?.declarations).toBe('fill: #ffffff;');
  });
});

describe('the form of a rectangular body', () => {
  it('is rounded from a corner radius of 8, a box below and without one', () => {
    expect([rectForm(), rectForm(0), rectForm(6), rectForm(8), rectForm(12)]).toEqual([
      'box',
      'box',
      'box',
      'rounded',
      'rounded',
    ]);
  });
});
