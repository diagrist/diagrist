import { describe, expect, it } from 'vitest';
import { checkPlugin, compile, definePlugin, formatMessage, toSvg } from '../src/index.js';
import { linesPlugin, styles } from './fixture.js';

const source = ['diagram lines "Greeting"', 'line "a < b & c"', 'line ""'].join('\n');

describe('compile', () => {
  it('reports that no plugin draws the kind, and names the registered ones', () => {
    const [none] = compile(source, { plugins: [] }).diagnostics;
    expect(none?.code).toBe('K100');
    expect(none && formatMessage(none, [])).toContain('Registered kinds: none.');
    const [other] = compile('diagram flow "x"', { plugins: [linesPlugin] }).diagnostics;
    expect(other?.values).toMatchObject({ found: 'flow', allowed: '`lines`' });
  });

  it('runs the rules of the kind and phrases their findings from the plugin catalogue', () => {
    const result = compile(source, { plugins: [linesPlugin] });
    expect(result.diagnostics.map((d) => [d.code, d.severity, d.span.line])).toEqual([['T900', 'warning', 3]]);
    const [warning] = result.diagnostics;
    expect(warning && formatMessage(warning, [linesPlugin], 'de')).toBe('Die Zeile ist leer.');
    expect(result.description).toBe('a < b & c\n');
  });

  it('draws nothing when the source has errors', () => {
    const result = compile('diagram lines "x"\nline', { plugins: [linesPlugin] });
    expect(result.diagnostics.map((d) => d.code)).toEqual(['L102']);
    expect(result.svg).toBeUndefined();
  });

  it('takes the locale of the picture from the header, English by default', () => {
    expect(compile('diagram lines "x" locale=de', { plugins: [linesPlugin] }).locale).toBe('de');
    expect(compile('diagram lines "x"', { plugins: [linesPlugin] }).locale).toBe('en');
  });

  it('keeps the first of two plugins that register the same kind, with a warning', () => {
    const twin = definePlugin({ ...linesPlugin, name: 'twin' });
    const result = compile(source, { plugins: [linesPlugin, twin] });
    expect(result.diagnostics[0]).toMatchObject({ code: 'K101', values: { plugins: '`lines`, `twin`' } });
    expect(result.svg).toBeDefined();
  });

  it('gives the same bytes for the same source', () => {
    expect(compile(source, { plugins: [linesPlugin] }).svg).toBe(compile(source, { plugins: [linesPlugin] }).svg);
  });
});

describe('toSvg', () => {
  const scene = {
    width: 10,
    height: 10,
    title: 'T',
    children: [
      { kind: 'path' as const, d: 'M0 0 L1 1', role: 'rule', offset: [0, 3] as const },
      {
        kind: 'group' as const,
        id: 'edge-0',
        children: [{ kind: 'rect' as const, x: 1.25, y: 2, w: 3, h: 4, role: 'line' }],
      },
    ],
  };

  it('writes classes and arrowheads from the role table, and only the rules a shape uses', () => {
    const svg = toSvg(scene, styles);
    expect(svg).toContain(
      '<path d="M0 0 L1 1" class="stroke thin" marker-end="url(#m-open)" transform="translate(0 3)"/>',
    );
    expect(svg).toContain('<g id="edge-0"><rect x="1.3" y="2" width="3" height="4" class="text"/></g>');
    expect(svg).toContain('.dia .base {');
    expect(svg).toContain('.dia .stroke {');
    expect(svg).toContain('<marker id="m-open"');
  });

  it('escapes texts and leaves the stylesheet out when inline', () => {
    const svg = compile(source, { plugins: [linesPlugin], inline: true }).svg ?? '';
    expect(svg).toContain('aria-label="en: &quot;lines&quot; &amp; &lt;more&gt;"');
    expect(svg).toContain('>a &lt; b &amp; c</text>');
    expect(svg).not.toContain('<style>');
  });
});

describe('checkPlugin', () => {
  it('accepts a documented plugin and names missing messages', () => {
    expect(checkPlugin(linesPlugin)).toEqual([]);
    expect(checkPlugin({ ...linesPlugin, messages: {} })).toEqual([
      'rule T900 has no message in en',
      'rule T900 has no message in de',
    ]);
  });
});
