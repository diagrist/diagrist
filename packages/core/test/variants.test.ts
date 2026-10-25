import { describe, expect, it } from 'vitest';
import { compile, definePlugin } from '../src/index.js';
import { linesPlugin } from './fixture.js';

const plugins = [linesPlugin];
const base = ['diagram lines "Greeting"', 'line "Hello"'];
const codes = (source: readonly string[], options = {}) =>
  compile(source.join('\n'), { plugins, ...options }).diagnostics.map((d) => [d.code, d.picture]);

describe('compile with variants', () => {
  it('draws the base and every variant, each with its own description', () => {
    const result = compile([...base, 'variant v "Later"', '  line "Bye"'].join('\n'), { plugins });
    expect(result.pictures.map((p) => [p.variant, p.description])).toEqual([
      [undefined, 'Hello'],
      ['v', 'Hello\nBye'],
    ]);
    expect(result.svg).toBe(result.pictures[0]?.svg);
  });

  it('lists a finding every picture has once, and names the picture of the others', () => {
    expect(codes([...base, 'line ""', 'variant v "V"', '  line "Bye"'])).toEqual([['T900', undefined]]);
    expect(codes([...base, 'variant v "V"', '  line ""'])).toEqual([['T900', 'v']]);
  });

  it('reports a diff on a kind that draws none (K103), not on one that does', () => {
    expect(codes([...base, 'variant v "V" diff', '  line "Bye"'])).toEqual([['K103', 'v']]);
    const [kind] = linesPlugin.kinds;
    const differ = definePlugin({ ...linesPlugin, kinds: kind ? [{ ...kind, diff: true }] : [] });
    expect(codes([...base, 'variant v "V" diff', '  line "Bye"'], { plugins: [differ] })).toEqual([]);
  });

  it('names the files it needs and reads them from `files`', () => {
    const using = ['diagram lines "Paper"', 'use "parts/hello.dgr"'];
    const first = compile(using.join('\n'), { plugins, path: 'docs/paper.dgr' });
    expect(first.needs.map((n) => [n.path, n.span.line])).toEqual([['docs/parts/hello.dgr', 2]]);
    expect(first.diagnostics.map((d) => d.code)).toEqual(['L118']);
    const files = { 'docs/parts/hello.dgr': base.join('\n') };
    const second = compile(using.join('\n'), { plugins, path: 'docs/paper.dgr', files });
    expect(second.diagnostics).toEqual([]);
    expect(second.description).toBe('Hello');
  });
});
