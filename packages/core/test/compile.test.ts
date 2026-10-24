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

  it('reports a source without header line as L100 with the registered kinds and an example, not as K100', () => {
    const result = compile('line "Hello"', { plugins: [linesPlugin] });
    expect(result.diagnostics.map((d) => [d.code, d.span.line, d.span.column])).toEqual([['L100', 1, 1]]);
    const [missing] = result.diagnostics;
    expect(missing && formatMessage(missing, [linesPlugin])).toBe(
      'A diagram starts with `diagram <kind> "Title"`. Registered kinds: `lines`. Example: `diagram lines "Title"`',
    );
    expect(missing && formatMessage(missing, [linesPlugin], 'de')).toContain('Registrierte Arten: `lines`.');
    expect(compile('diagram "Greeting"', { plugins: [linesPlugin] }).diagnostics[0]?.code).toBe('L100');
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

  it('reports a plugin that throws as K110 with plugin, kind and the first line of the error, and does not throw', () => {
    const [lines] = linesPlugin.kinds;
    if (lines === undefined) return;
    const layout = () => {
      throw new RangeError('Maximum call stack size exceeded\n    at bareGuard');
    };
    const broken = definePlugin({ ...linesPlugin, name: 'broken', kinds: [{ ...lines, layout }] });
    const result = compile('diagram lines "x"\nline "a"', { plugins: [broken] });
    expect(result.svg).toBeUndefined();
    expect(result.diagnostics).toEqual([
      {
        code: 'K110',
        severity: 'error',
        span: { line: 1, column: 1, length: 7 },
        values: { plugin: 'broken', kind: 'lines', error: 'RangeError: Maximum call stack size exceeded' },
      },
    ]);
    const [failed] = result.diagnostics;
    expect(failed && formatMessage(failed, [broken])).toBe(
      'The plugin `broken` failed while drawing the kind `lines`: RangeError: Maximum call stack size exceeded. This is a bug, not a mistake in the diagram; please report it with the diagram at https://github.com/diagrist/diagrist/issues.',
    );
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

  it('replaces what XML cannot hold, so a text that reaches it another way still gives a parsable SVG', () => {
    const text = {
      kind: 'text' as const,
      x: 0,
      y: 0,
      text: 'a\u0001\ud800\uffff\u{1F600}',
      role: 'line',
      font: 'body',
    };
    const svg = toSvg({ ...scene, title: 'T\u001b', children: [text] }, styles);
    expect(svg).toContain('aria-label="T\ufffd"');
    expect(svg).toContain('>a\ufffd\ufffd\ufffd\u{1F600}</text>');
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

  it('lets kinds share a rule, but reports two rules with one code', () => {
    const [kind] = linesPlugin.kinds;
    if (kind === undefined) return;
    const twin = { ...kind, spec: { ...kind.spec, name: 'twin' } };
    expect(checkPlugin({ ...linesPlugin, kinds: [kind, twin] })).toEqual([]);
    const other = { ...twin, rules: kind.rules.map((rule) => ({ ...rule })) };
    expect(checkPlugin({ ...linesPlugin, kinds: [kind, other] })).toEqual(['rule T900 is defined twice']);
  });
});
