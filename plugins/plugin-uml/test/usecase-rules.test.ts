import { compile, formatMessage } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { codes, usecase } from './compile.js';

/** A shop with two actors, one subject and three use cases, valid on its own. */
const BASE = [
  'actor k "Customer"',
  'actor s "Regular"',
  'subject sys "Shop"',
  'usecase b "Order" in sys points="voucher"',
  'usecase z "Pay" in sys',
  'usecase g "Redeem voucher" in sys',
  'rel k -- b',
  'rel s -- z',
  'rel k -- g',
];

/** Per code a line that triggers it and a corrected line that does not. */
const CASES: readonly (readonly [string, string, string])[] = [
  ['L104', 'actor x "X" in sys\nrel x -- g', 'actor x "X"\nrel x -- g'],
  ['U421', 'rel k --> z include', 'rel b --> z include'],
  ['U421', 'rel g --> k extend when="v" at="voucher"', 'rel g --> b extend when="v" at="voucher"'],
  ['U422', 'rel k -- s', 'rel k -- z'],
  ['U422', 'rel b -- z', 'rel b --> z include'],
  ['U423', 'rel s -|> b', 'rel s -|> k'],
  ['U423', 'rel s -|> k\nrel k -|> s', 'rel s -|> k'],
  ['U423', 'rel g -|> g', 'rel g -|> b'],
  ['U424', 'rel g --> b extend when="v" at="discount"', 'rel g --> b extend when="v" at="voucher"'],
  ['U424', 'usecase x "X" in sys points="a, a"\nrel k -- x', 'usecase x "X" in sys points="a, b"\nrel k -- x'],
  ['U425', 'rel b --> z include\nrel z --> b include', 'rel b --> z include'],
  ['U426', 'rel b --> z', 'rel b --> z include'],
  ['U426', 'rel b --> z include extend', 'rel b --> z include'],
  ['U426', 'rel k -- g include', 'rel k -- g'],
  ['U426', 'rel b --> z include card=1', 'rel b --> z include'],
  ['U426', 'rel b --> z include when="x"', 'rel g --> b extend when="x" at="voucher"'],
  ['L103', 'rel k -- g card=3..1', 'rel k -- g card=1..3'],
  [
    'U427',
    'usecase x "X" in sys stereotype="include"\nrel k -- x',
    'usecase x "X" in sys stereotype="batch"\nrel k -- x',
  ],
  ['U428', 'note "N"', 'note "N" on sys'],
  ['U920', 'usecase x "X"\nrel k -- x', 'usecase x "X" in sys\nrel k -- x'],
  ['U921', 'usecase x "X" in sys', 'usecase x "X" in sys\nrel b --> x include'],
  ['U922', 'rel g --> b extend at="voucher"', 'rel g --> b extend when="v" at="voucher"'],
  ['U922', 'rel g --> b extend when="v"', 'rel g --> b extend when="v" at="voucher"'],
  ['U923', 'actor x "X"', 'actor x "X"\nrel x -- g'],
  ['U924', 'rel b --> g include\nrel g --> b extend when="v" at="voucher"', 'rel b --> g include'],
  ['U926', 'subject empty "Empty"', 'subject full "Full"\nusecase x "X" in full\nrel k -- x'],
  ['L107', 'note "N" on nowhere', 'note "N" on sys'],
  ['L107', 'rel k -- zz', 'rel k -- g'],
  ['L107', 'rel k -- sys', 'rel k -- g'],
  ['L108', 'usecase k "Twice" in sys', 'usecase k2 "Twice" in sys\nrel s -- k2'],
];

describe('use case rules', () => {
  it.each(CASES)('%s reports the wrong line, not the corrected one', (code, wrong, right) => {
    expect(codes(usecase(...BASE, wrong))).toContain(code);
    expect(codes(usecase(...BASE, right))).not.toContain(code);
  });

  it('report a diagram without actors and a direction without effect at the header', () => {
    const none = usecase('usecase a "A"').diagnostics;
    expect(none.map((d) => [d.code, d.span.line])).toEqual([['U923', 1]]);
    const source = ['diagram usecase "T" direction=right', 'actor k "K"', 'usecase a "A"', 'rel k -- a'];
    const direction = compile(source.join('\n'), { plugins: [umlPlugin] }).diagnostics;
    expect(direction.map((d) => [d.code, d.span.line])).toEqual([['U927', 1]]);
  });

  it('phrase every finding in en and de, naming what to write instead', () => {
    for (const [code, wrong] of CASES.filter(([c]) => c.startsWith('U'))) {
      const found = usecase(...BASE, wrong).diagnostics.find((d) => d.code === code);
      for (const locale of ['en', 'de'] as const) {
        const text = found ? formatMessage(found, [umlPlugin], locale) : '';
        expect(text, `${code} ${locale}`).not.toBe(code);
        expect(text, `${code} ${locale}`).not.toMatch(/undefined|\$\{/);
      }
    }
  });

  it('teach both forms when `-->` names no kind', () => {
    const found = usecase(...BASE, 'rel b --> z').diagnostics.find((d) => d.code === 'U426');
    const text = found ? formatMessage(found, [umlPlugin], 'en') : '';
    expect(text).toContain('include');
    expect(text).toContain('extend when=');
    expect(found?.span.line).toBe(BASE.length + 2);
  });

  it('cover every rule of the kind, and draw no picture with an error', () => {
    const rules = umlPlugin.kinds.filter((k) => k.spec.name === 'usecase').flatMap((k) => k.rules.map((r) => r.code));
    const tested = new Set([...CASES.map(([code]) => code), 'U923', 'U927']);
    expect(rules.filter((code) => !tested.has(code))).toEqual([]);
    expect(usecase(...BASE, 'rel k --> z include').svg).toBeUndefined();
    expect(usecase(...BASE, 'actor x "X"').svg).toBeDefined();
  });
});
