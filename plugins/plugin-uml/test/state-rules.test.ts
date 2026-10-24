import { compile, formatMessage } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { codes, stateDiagram } from './compile.js';

/** A small machine, valid on its own: a choice, a composite state with its own start, a final state. */
const BASE = [
  'initial start',
  'state open "Open" entry="set deadline"',
  'state active "Active"',
  'initial inner in active',
  'state pack "Pack" in active',
  'state ship "Ship" in active',
  'choice paid',
  'final end',
  'go start -> open',
  'go open -> paid on="pay"',
  'go paid -> active when="covered"',
  'go paid -> open when=else',
  'go inner -> pack',
  'go pack -> ship on="packed"',
  'go ship -> end on="delivered"',
];

const PAR = 'state par "Par"\nregion ra "A" in par\nregion rb "B" in par\nstate x "X" in ra\nstate y "Y" in rb';

/** Per code a line that triggers it and a corrected line that does not. */
const CASES: readonly (readonly [string, string, string])[] = [
  ['U440', 'go end -> open', 'go open -> end'],
  ['U440', 'go open -> start', 'go open -> end'],
  ['U441', 'fork f\ngo open -> f on="s"\ngo f -> pack', 'fork f\ngo open -> f on="s"\ngo f -> pack\ngo f -> ship'],
  ['U442', 'go paid -> end on="x" when="y"', 'go paid -> end when="y"'],
  ['U443', 'initial second\ngo second -> open', 'history h in active'],
  ['U444', 'history h', 'history h in active'],
  ['U445', 'internal open do="x"', 'internal open on="y" do="x"'],
  [
    'U446',
    'fork f\ngo open -> f on="s"\ngo f -> end\ngo f -> pack',
    'fork f\ngo open -> f on="s"\ngo f -> ship\ngo f -> pack',
  ],
  ['U447', 'go paid -> end when=else', 'go paid -> end when="cancelled"'],
  ['U448', 'region r "R"', 'state p "P"\nregion r "R" in p'],
  ['U448', `${PAR}\ngo x -> y`, `${PAR}\ngo x -> end`],
  ['U449', 'exitpoint q "Q"', 'exitpoint q "Q" in active\ngo ship -> q\ngo q -> end'],
  ['U449', 'entrypoint e "E" in active\ngo pack -> e', 'entrypoint e "E" in active\ngo open -> e on="z"\ngo e -> pack'],
  ['U460', 'entrypoint e "E" in open', 'state sub "S" submachine="M"\nentrypoint e "E" in sub'],
  ['U461', 'state sub "S" submachine="M"\nstate x "X" in sub', 'state sub "S" submachine="M"\nstate x "X"'],
  ['U462', 'go open -> end on="after 3 days"', 'go open -> end on="after(3 days)"'],
  ['U462', 'go open -> end when="after(3 days)"', 'go open -> end on="after(3 days)"'],
  ['U464', 'go open -> end on="x" post="y"', 'go open -> end on="x"'],
  ['U465', 'note "N"', 'note "N" on open'],
  ['U941', 'state lone "Lone"\ngo lone -> end', 'state lone "Lone"\ngo lone -> end\ngo open -> lone on="q"'],
  ['U942', 'state stuck "S"\ngo open -> stuck on="s"', 'state stuck "S"\ngo open -> stuck on="s"\ngo stuck -> end'],
  [
    'U943',
    'choice c\ngo open -> c on="c"\ngo c -> end when="a"',
    'choice c\ngo open -> c on="c"\ngo c -> end when="a"\ngo c -> open when=else',
  ],
  ['U943', 'go open -> end when=else', 'go open -> end when="done"'],
  ['U944', 'go open -> end on="pay"', 'go open -> end on="quit"'],
  ['U945', 'go open -> open on="tick"', 'internal open on="tick"'],
  [
    'U946',
    'state c2 "C2"\nstate k "K" in c2\ngo open -> c2 on="z"',
    'state c2 "C2"\nstate k "K" in c2\ngo open -> c2 on="z"\ninitial ci in c2\ngo ci -> k',
  ],
  [
    'U947',
    'fork f\ngo open -> f on="s"\ngo f -> pack\ngo f -> ship',
    'fork f\ngo open -> f on="s"\ngo f -> pack\ngo f -> ship\njoin j\ngo pack -> j\ngo ship -> j\ngo j -> end',
  ],
  [
    'U948',
    `${PAR}\ninitial ia in ra\ngo ia -> x\ngo open -> par on="p"`,
    `${PAR}\ninitial ia in ra\ngo ia -> x\ngo open -> par on="p"\ninitial ib in rb\ngo ib -> y`,
  ],
  [
    'U949',
    'entrypoint e "E" in active\ngo open -> e on="z"',
    'entrypoint e "E" in active\ngo open -> e on="z"\ngo e -> pack',
  ],
  [
    'U960',
    'state d "D" defer="pay"\ngo d -> end on="pay"\ngo open -> d on="hold"',
    'state d "D" defer="packed"\ngo d -> end on="go"\ngo open -> d on="hold"',
  ],
  [
    'U961',
    'state d "D" defer="never"\ngo d -> end on="x"\ngo open -> d on="hold"',
    'state d "D" defer="pay"\ngo d -> end on="x"\ngo open -> d on="hold"',
  ],
  ['L104', 'state h "H" deep', 'history h in active deep'],
  ['L107', 'region r "R" in paid', 'region r "R" in open'],
  ['L107', 'go open -> active2', 'go open -> active'],
];

const memo = new Map<string, ReturnType<typeof stateDiagram>>();

/** Compiles a case once: layouts of state machines take a while, and two tests read the same cases. */
function machine(...lines: string[]) {
  const key = lines.join('\n');
  const known = memo.get(key);
  if (known) return known;
  const result = stateDiagram(...lines);
  memo.set(key, result);
  return result;
}

const protocol = (...lines: string[]) =>
  compile(['diagram state "API {protocol}"', ...lines].join('\n'), { plugins: [umlPlugin] });

describe('state rules', { timeout: 30_000 }, () => {
  it.each(CASES)('%s reports the wrong line, not the corrected one', (code, wrong, right) => {
    expect(codes(machine(...BASE, ...wrong.split('\n')))).toContain(code);
    expect(codes(machine(...BASE, ...right.split('\n')))).not.toContain(code);
  });

  it('accept the base machine without findings', () => {
    expect(codes(stateDiagram(...BASE))).toEqual([]);
  });

  it('allow no behaviour, effect or history in a protocol state machine, and a postcondition there only', () => {
    const base = ['initial s', 'state a "A"', 'final e', 'go s -> a', 'go a -> e on="close()" post="closed"'];
    expect(codes(protocol(...base))).toEqual([]);
    expect(codes(protocol(...base, 'state b "B" entry="x"', 'go a -> b on="b()"', 'go b -> e'))).toContain('U463');
    expect(codes(protocol(...base.slice(0, 4), 'go a -> e on="close()" do="x"'))).toContain('U463');
    expect(codes(stateDiagram(...base))).toContain('U464');
  });

  it('warn about a machine without initial pseudostate at the header-near first vertex', () => {
    const found = stateDiagram('state a "A"', 'final e', 'go a -> e').diagnostics;
    expect(found.map((d) => [d.code, d.span.line])).toEqual([['U940', 2]]);
  });

  it('phrase every finding in en and de, without holes', () => {
    for (const [code, wrong] of CASES.filter(([c]) => c.startsWith('U'))) {
      const found = machine(...BASE, ...wrong.split('\n')).diagnostics.find((d) => d.code === code);
      for (const locale of ['en', 'de'] as const) {
        const text = found ? formatMessage(found, [umlPlugin], locale) : '';
        expect(text, `${code} ${locale}`).not.toBe(code);
        expect(text, `${code} ${locale}`).not.toMatch(/undefined|\$\{/);
      }
    }
  });

  it('cover every rule of the kind, and draw no picture with an error', () => {
    const rules = umlPlugin.kinds.filter((k) => k.spec.name === 'state').flatMap((k) => k.rules.map((r) => r.code));
    const tested = new Set([...CASES.map(([code]) => code), 'U463', 'U940']);
    expect(rules.filter((code) => !tested.has(code))).toEqual([]);
    expect(stateDiagram(...BASE, 'go end -> open').svg).toBeUndefined();
    expect(stateDiagram(...BASE, 'go open -> end on="pay"').svg).toBeDefined();
  });
});
