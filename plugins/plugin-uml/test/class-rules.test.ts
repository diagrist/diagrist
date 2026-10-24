import { formatMessage } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { classDiagram, codes } from './compile.js';

/** A small model, valid on its own: a package with a class and an interface, a concrete and an abstract class. */
const BASE = [
  'package domain "domain"',
  'package web "web"',
  'class order "Order" in domain',
  '  "- number : String"',
  '  "+ total() : Money"',
  'class item "Item" in domain',
  'interface repo "Repository" in domain',
  '  "+ save(o : Order) : void"',
  'class doc "Document" abstract',
  'class ctrl "Controller" in web',
  'rel order *-- item source=1 card=1..*',
  'rel ctrl --> order',
];

/** Per code a line that triggers it and a corrected line that does not. */
const CASES: readonly (readonly [string, string, string])[] = [
  ['U410', 'rel order --|> doc', 'rel order --|> repo'],
  ['U410', 'interface p "P"\nrel repo --|> p', 'interface p "P"\nrel repo -|> p'],
  ['U411', 'rel order -|> repo', 'rel order --|> repo'],
  ['U411', 'rel order -|> doc\nrel doc -|> order', 'rel order -|> doc'],
  ['U411', 'rel doc -|> doc', 'rel order -|> doc'],
  ['U412', 'class x "X"\n  "+ run() : void" abstract', 'class x "X" abstract\n  "+ run() : void" abstract'],
  ['U412', 'class x "X" abstract\n  "- a : int" abstract', 'class x "X" abstract\n  "- a : int"'],
  ['U413', 'class x "X"\n  "- first name : String"', 'class x "X"\n  "- firstName : String"'],
  ['U413', 'class x "X"\n  "+ run( : void"', 'class x "X"\n  "+ run() : void"'],
  ['U413', 'enum s "S"\n  "PAID LATE"', 'enum s "S"\n  "PAID_LATE"'],
  ['U414', 'rel ctrl --> repo card=1', 'rel ctrl --> repo'],
  ['U415', 'rel doc *-- item source=0..*', 'rel doc o-- item source=0..*'],
  ['U416', 'class x "X"\n  "- a : int"\n  "- a : String"', 'class x "X"\n  "- a : int"\n  "- b : String"'],
  ['U417', 'rel order --> doc class=ctrl', 'rel order -- doc class=ctrl source=1 card=1'],
  ['U417', 'rel order -- doc class=order source=1 card=1', 'rel order -- doc class=ctrl source=1 card=1'],
  ['U418', 'rel web -- domain', 'rel web --> domain'],
  ['U418', 'rel ctrl -- order import source=1 card=1', 'rel web --> domain import'],
  ['U419', 'rel domain --> order', 'rel web --> domain'],
  ['U470', 'rel ctrl -> order nonav=to source=1 card=1', 'rel ctrl -> order nonav=from source=1 card=1'],
  ['U470', 'rel ctrl --> doc nonav=from', 'rel ctrl --> doc'],
  ['U471', 'note "N"', 'note "N" on order'],
  ['U910', 'rel ctrl -- doc', 'rel ctrl -- doc source=1 card=0..*'],
  [
    'U911',
    'rel ctrl -- doc source=1 card=1\nrel ctrl -- doc source=1 card=1',
    'rel ctrl -- doc source=1 card=1\nrel ctrl -- doc "audits" source=1 card=1',
  ],
  ['U912', 'rel order --> ctrl', 'rel ctrl --> order'],
  ['U913', 'package empty "empty"', 'package full "full"\nclass f "F" in full'],
  ['U916', 'class x "X"\n  "+ run() : int {readOnly}"', 'class x "X"\n  "+ run() : int {query}"'],
  [
    'U917',
    'assoc a "A"\nrel a -- order card=1\nrel a -- doc card=1',
    'assoc a "A"\nrel a -- order card=1\nrel a -- doc card=1\nrel a -- ctrl card=1',
  ],
  [
    'U918',
    'assoc a "A"\nrel a -- order card=1\nrel a -- doc card=1\nrel a o-- ctrl card=1',
    'assoc a "A"\nrel a -- order card=1\nrel a -- doc card=1\nrel a -- ctrl card=1',
  ],
  ['L103', 'rel ctrl -- doc source=3..1 card=1', 'rel ctrl -- doc source=1..3 card=1'],
  ['L107', 'rel order -- doc class=repo source=1 card=1', 'rel order -- doc class=ctrl source=1 card=1'],
  ['L107', 'class x "X" in nowhere', 'class x "X" in web'],
];

describe('class rules', () => {
  it.each(CASES)('%s reports the wrong line, not the corrected one', (code, wrong, right) => {
    expect(codes(classDiagram(...BASE, ...wrong.split('\n')))).toContain(code);
    expect(codes(classDiagram(...BASE, ...right.split('\n')))).not.toContain(code);
  });

  it('accept the base model without findings', () => {
    expect(codes(classDiagram(...BASE))).toEqual([]);
  });

  it('phrase every finding in en and de, without holes', () => {
    for (const [code, wrong] of CASES.filter(([c]) => c.startsWith('U'))) {
      const found = classDiagram(...BASE, ...wrong.split('\n')).diagnostics.find((d) => d.code === code);
      for (const locale of ['en', 'de'] as const) {
        const text = found ? formatMessage(found, [umlPlugin], locale) : '';
        expect(text, `${code} ${locale}`).not.toBe(code);
        expect(text, `${code} ${locale}`).not.toMatch(/undefined|\$\{/);
      }
    }
  });

  it('point at the member line of a member finding', () => {
    const found = classDiagram(...BASE, 'class x "X"', '  "- first name : String"').diagnostics;
    expect(found.find((d) => d.code === 'U413')?.span.line).toBe(BASE.length + 3);
  });

  it('cover every rule of the kind, and draw no picture with an error', () => {
    const rules = umlPlugin.kinds.filter((k) => k.spec.name === 'class').flatMap((k) => k.rules.map((r) => r.code));
    const tested = new Set(CASES.map(([code]) => code));
    expect(rules.filter((code) => !tested.has(code))).toEqual([]);
    expect(classDiagram(...BASE, 'rel order --|> doc').svg).toBeUndefined();
    expect(classDiagram(...BASE, 'rel ctrl -- doc').svg).toBeDefined();
  });
});
