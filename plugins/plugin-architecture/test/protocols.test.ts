import { describe, expect, it } from 'vitest';
import { compileExample, source } from './compile.js';

const EXAMPLE = 'radverleih/kontext.dgr';
const FORMS = ['same', 'brackets', 'muted', 'chip', 'inline'] as const;
const LAYOUTS = ['', 'layout=adaptive', 'layout=star'] as const;

/** The example with `attrs` added to its header line. */
const withHeader = (attrs: string): string =>
  source(EXAMPLE).replace(/^(diagram .*)$/m, (line) => `${line} ${attrs}`.trimEnd());

const codes = (attrs: string): string[] =>
  compileExample(EXAMPLE, withHeader(attrs))
    .diagnostics.map((d) => d.code)
    .sort();

describe('protocols= sets the protocol of an edge apart from its sentence', () => {
  for (const layout of LAYOUTS)
    for (const form of FORMS)
      it(`finds no more placement problems than the default: ${form} ${layout || 'fixed'}`, () => {
        const before = codes(layout);
        const extra = codes(`${layout} protocols=${form}`).filter((c) => {
          const at = before.indexOf(c);
          if (at >= 0) before.splice(at, 1);
          return at < 0;
        });
        expect(extra).toEqual([]);
      });

  it('draws the default form byte for byte as without the attribute', () => {
    expect(compileExample(EXAMPLE, withHeader('protocols=same')).svg).toBe(compileExample(EXAMPLE).svg);
  });

  it('writes brackets around the protocol and frames it as a chip', () => {
    const brackets = compileExample(EXAMPLE, withHeader('protocols=brackets')).svg ?? '';
    const chip = compileExample(EXAMPLE, withHeader('layout=star protocols=chip')).svg ?? '';
    expect(brackets).toContain('[HTTPS]');
    expect(chip.match(/class="via-chip"/g)).toHaveLength(6);
  });

  it('sets the protocol of every edge in its own role, a muted one in grey', () => {
    const muted = compileExample(EXAMPLE, withHeader('layout=star protocols=muted')).svg ?? '';
    expect(muted.match(/class="label-via-muted halo"/g)).toHaveLength(6);
  });
});
