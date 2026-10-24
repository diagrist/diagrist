import { formatMessage } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { activity, codes } from './compile.js';

/** Two lanes, a decision with a merge, a fork with a join: valid on its own, without findings. */
const BASE = [
  'partition a "A"',
  'partition b "B"',
  'initial start in a',
  'action work "Work" in a',
  'decision d "Ok?" in a',
  'action yes "Yes" in a',
  'action no "No" in a',
  'merge m in a',
  'fork f in a',
  'action left "Left" in a',
  'action right "Right" in b',
  'join j in a',
  'final end in a',
  'go start -> work',
  'go work -> d',
  'go d -> yes "ok"',
  'go d -> no else',
  'go yes -> m',
  'go no -> m',
  'go m -> f',
  'go f -> left',
  'go f -> right',
  'go left -> j',
  'go right -> j',
  'go j -> end',
];

const REGION = 'interruptible r "R"';
const EXPANSION = 'expansion x "X"\naction inner "Inner" in a expansion=x';

/** Per code lines that trigger it and corrected lines that do not. */
const CASES: readonly (readonly [string, string, string])[] = [
  ['U430', 'go yes -> start', ''],
  ['U430', 'go end -> work', ''],
  ['U431', 'go yes -> d', ''],
  ['U432', 'go m -> no', ''],
  ['U432', 'go yes -> f', ''],
  ['U433', 'action z "Z" in a\ngo d -> z "ok"\ngo z -> m', 'action z "Z" in a\ngo d -> z "later"\ngo z -> m'],
  ['U433', 'action z "Z" in a\ngo work -> z else\ngo z -> end', 'action z "Z" in a\ngo work -> z\ngo z -> end'],
  ['U434', 'object o "O" in a\ngo work -> o\ngo o => end', 'object o "O" in a\ngo work => o\ngo o => end'],
  ['U434', 'go yes => end', 'go yes -> end'],
  ['U435', 'join z in a\ngo yes -> z\ngo no -> z\ngo z -> end', 'merge z in a\ngo yes -> z\ngo no -> z\ngo z -> end'],
  ['U437', 'go left ~> end', 'go left -> end'],
  [
    'U437',
    `${REGION}\naccept c "C" in a interruptible=r\naction z "Z" in a interruptible=r\ngo c ~> z\ngo z -> end`,
    `${REGION}\naccept c "C" in a interruptible=r\naction z "Z" in a\ngo c ~> z\ngo z -> end`,
  ],
  ['U455', 'action p "P" in b input="A, A"', 'action p "P" in b input="A, B"'],
  ['U455', 'go yes -> end pin="A"', 'go yes -> end'],
  [
    'U455',
    'action p "P" in a output="A"\naction q "Q" in a input="B"\ngo p => q pin="C"',
    'action p "P" in a output="A"\naction q "Q" in a input="B"\ngo p => q pin="A"',
  ],
  ['U456', 'action h "H" in b\nhandler work -> h "E"\ngo h -> end', 'action h "H" in b\nhandler work -> h "E"'],
  ['U456', 'handler work -> work "E"', 'action h "H" in b\nhandler work -> h "E"'],
  ['U456', 'action h "H" in b input="X"\nhandler work -> h "E"', 'action h "H" in b\nhandler work -> h "E"'],
  ['U456', 'action h "H" in b output="X"\nhandler work -> h "E"', 'action h "H" in b\nhandler work -> h "E"'],
  ['U457', `${EXPANSION}\ngo x => inner`, `${EXPANSION}\ngo work => x\ngo x => inner`],
  ['U458', `${EXPANSION}\ngo work -> x\ngo x => inner`, `${EXPANSION}\ngo work => x\ngo x => inner`],
  ['U930', 'initial s2 in a\ngo s2 -> end', ''],
  [
    'U931',
    'decision e in a\ngo yes -> e\ngo e -> end "x"',
    'decision e in a\ngo yes -> e\ngo e -> end "x"\ngo e -> m else',
  ],
  ['U932', 'merge z in a\ngo yes -> z\ngo z -> end', 'merge z in a\ngo yes -> z\ngo no -> z\ngo z -> end'],
  ['U932', 'fork z in a\ngo yes -> z\ngo z -> end', 'fork z in a\ngo yes -> z\ngo z -> end\ngo z -> m'],
  ['U933', 'action z "Z" in a\ngo d -> z\ngo z -> m', 'action z "Z" in a\ngo d -> z "maybe"\ngo z -> m'],
  [
    'U934',
    'decision e in a\ngo yes -> e\ngo e -> end "small"\ngo e -> m "large"',
    'decision e in a\ngo yes -> e\ngo e -> end "yes"\ngo e -> m "no"',
  ],
  ['U935', 'action z "Z" in a\ngo z -> end', 'action z "Z" in a\ngo yes -> z\ngo z -> end'],
  ['U936', 'action z "Z" in a\ngo yes -> z', 'action z "Z" in a\ngo yes -> z\ngo z -> end'],
  [
    'U937',
    'merge z in a\ngo left -> z\ngo right -> z\ngo z -> end',
    'join z in a\ngo left -> z\ngo right -> z\ngo z -> end',
  ],
  [
    'U938',
    'fork z in a\nfinal e2 in a\nfinal e3 in a\ngo yes -> z\ngo z -> e2\ngo z -> e3',
    'fork z in a\nfinal e2 in a\nflowfinal e3 in a\ngo yes -> z\ngo z -> e2\ngo z -> e3',
  ],
  ['U939', 'go yes -> no', ''],
  [
    'U955',
    `${REGION}\naction z "Z" in a interruptible=r\ngo yes -> z\ngo z -> end`,
    `${REGION}\naction z "Z" in a interruptible=r\naccept c "C" in a interruptible=r\ngo yes -> z\ngo z -> end\ngo c ~> end`,
  ],
  [
    'U956',
    `${EXPANSION}\ngo work => x\ngo x => inner\ngo inner -> end`,
    `${EXPANSION}\ngo work => x\ngo x => inner\ngo inner => x\ngo x => end`,
  ],
  ['U957', 'expansion x "X"\ngo work => x', `${EXPANSION}\ngo work => x\ngo x => inner`],
  ['L102', 'action z', 'action z "Z" in a\ngo yes -> z\ngo z -> end'],
  ['L104', 'initial s2 "Start" in a', 'initial s2 in a'],
  ['L104', 'decision e "Q?" in a call', 'action e "E" in a call\ngo yes -> e\ngo e -> end'],
  ['L105', 'decision e in a tone=blue', 'action e "E" in a tone=blue\ngo yes -> e\ngo e -> end'],
  ['L105', 'accept c "C" in a input="X"', 'accept c "C" in a output="X"'],
  ['L105', 'action z "Z" in a state="open"', 'object z "Z" in a state="open"'],
  ['L107', 'go start -> nowhere', ''],
  ['L107', 'handler work -> d "E"', 'action h "H" in b\nhandler work -> h "E"'],
  ['L108', 'action work "Again" in a', ''],
];

describe('activity rules', () => {
  it('find nothing in the base diagram', () => {
    expect(codes(activity(...BASE))).toEqual([]);
  });

  it.each(CASES)('%s reports the wrong lines, not the corrected ones', (code, wrong, right) => {
    expect(codes(activity(...BASE, wrong))).toContain(code);
    expect(codes(activity(...BASE, right))).not.toContain(code);
  });

  it('report an activity without start and end at the header', () => {
    const found = activity('action z "Z"').diagnostics.filter((d) => ['U930', 'U936'].includes(d.code));
    expect(found.map((d) => [d.code, d.span.line, d.values.case])).toEqual([
      ['U930', 1, 'none'],
      ['U936', 1, 'none'],
      ['U936', 2, 'open'],
    ]);
  });

  it('phrase every finding in en and de, without gaps', () => {
    for (const [code, wrong] of CASES.filter(([c]) => c.startsWith('U'))) {
      const found = activity(...BASE, wrong).diagnostics.find((d) => d.code === code);
      for (const locale of ['en', 'de'] as const) {
        const text = found ? formatMessage(found, [umlPlugin], locale) : '';
        expect(text, `${code} ${locale}`).not.toBe(code);
        expect(text, `${code} ${locale}`).not.toMatch(/undefined|\$\{|""|„“/);
      }
    }
  });

  it('name an edge at an expansion region by the region, as the source writes it', () => {
    const found = activity(...BASE, `${EXPANSION}\ngo work -> x\ngo x => inner`).diagnostics.find(
      (d) => d.code === 'U458',
    );
    expect(found ? formatMessage(found, [umlPlugin], 'en') : '').toContain('`go work -> x`');
  });

  it('cover every rule of the kind, and draw no picture with an error', () => {
    const rules = umlPlugin.kinds.filter((k) => k.spec.name === 'activity').flatMap((k) => k.rules.map((r) => r.code));
    const tested = new Set(CASES.map(([code]) => code));
    expect(rules.filter((code) => !tested.has(code))).toEqual([]);
    expect(activity(...BASE, 'go yes -> d').svg).toBeUndefined();
    expect(activity(...BASE, 'go yes -> no').svg).toBeDefined();
  });
});
