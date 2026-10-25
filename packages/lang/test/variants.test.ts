import { describe, expect, it } from 'vitest';
import { checkKind, formatDiagnostic, type GrammarStatement, grammarOf, kind, statement } from '../src/index.js';
import { BASE, board, codes, order, picture, unfolded } from './fixtures/board.js';

describe('unfold without variants', () => {
  it('gives the base as the only picture, read as readKind reads it', () => {
    const result = unfolded(BASE);
    expect(result.pictures).toHaveLength(1);
    expect(result.pictures[0]?.variant).toBeUndefined();
    expect(result.pictures[0]?.reading.statements.map((s) => s.keyword)).toEqual([
      'group',
      'node',
      'node',
      'node',
      'flow',
    ]);
    expect(result.needs).toEqual([]);
  });
});

describe('a variant', () => {
  it('takes the title and subtitle it names and keeps the rest of the header', () => {
    const reading = picture([...BASE, 'variant next "Tomorrow" subtitle="to be"', '  set c tone=green']);
    expect(reading?.header).toMatchObject({ title: 'Tomorrow', attributes: { subtitle: 'to be' } });
  });

  it('changes a line with set where it stands, and marks it changed', () => {
    const reading = picture([...BASE, 'variant v "V" diff', '  set b tone=green']);
    expect(order([...BASE, 'variant v "V"', '  set b tone=green'])).toEqual([
      'group shop',
      'node a',
      'node b',
      'node c',
      'flow f',
    ]);
    const b = reading?.statements[2];
    expect(b).toMatchObject({ id: 'b', origin: 'changed', attributes: { tone: 'green' }, clauses: { in: 'shop' } });
    expect(reading?.statements[1]?.origin).toBeUndefined();
  });

  it('puts a line declared again after its drop in the dropped line’s place', () => {
    const lines = [...BASE, 'variant v "V"', '  drop node a', '  node a "A2"'];
    expect(order(lines)).toEqual(['group shop', 'node a', 'node b', 'node c', 'flow f']);
    expect(picture(lines)?.statements[1]).toMatchObject({ label: 'A2' });
    expect(picture(lines.map((l) => l.replace('"V"', '"V" diff')))?.statements[1]?.origin).toBe('changed');
  });

  it('puts a new line before the next line of its keyword it declares again, else after the last of its keyword', () => {
    const before = [...BASE, 'variant v "V"', '  drop node b', '  node x "X"', '  node b "B2"', '  node y "Y"'];
    expect(order(before)).toEqual(['group shop', 'node a', 'node x', 'node b', 'node c', 'node y', 'flow f']);
    const after = [...BASE, 'variant v "V"', '  node x "X"', '  group g "G"'];
    expect(order(after)).toEqual(['group shop', 'group g', 'node a', 'node b', 'node c', 'node x', 'flow f']);
  });

  it('leaves out what it drops, and keeps it as removed in a diff picture', () => {
    const lines = [...BASE, 'variant v "V" diff', '  drop flow f', '  drop node c'];
    const result = unfolded(lines);
    expect(result.pictures[1]?.diff).toBeDefined();
    const drawn = result.pictures[1]?.reading.statements;
    expect(drawn?.filter((s) => s.origin === 'removed').map((s) => s.keyword)).toEqual(['node', 'flow']);
    const plain = unfolded(lines.map((l) => l.replace(' diff', ''))).pictures[1]?.reading.statements;
    expect(plain?.map((s) => s.keyword)).toEqual(['group', 'node', 'node']);
  });

  it('compares the lines of a block declared again one by one', () => {
    const lines = [
      ...BASE,
      'variant v "V" diff',
      '  drop flow f',
      '  flow f "Order"',
      '    a -> b "asks"',
      '    b -> c "stores twice"',
      '    c -> a "answers"',
    ];
    const flow = picture(lines)?.statements.find((s) => s.keyword === 'flow');
    const steps = flow && 'lines' in flow ? (flow.lines as readonly { label?: string; origin?: string }[]) : [];
    expect(steps.map((s) => [s.label, s.origin])).toEqual([
      ['asks', undefined],
      ['stores twice', 'changed'],
      ['answers', 'added'],
    ]);
  });

  it('builds on another variant with from, which must be declared above (L116) and exist (L107)', () => {
    const chain = [...BASE, 'variant one "1"', '  node x "X"', 'variant two "2" from one diff', '  set x tone=blue'];
    expect(codes(chain)).toEqual([]);
    expect(picture(chain, 2)?.statements.find((s) => 'id' in s && s.id === 'x')).toMatchObject({
      origin: 'changed',
      attributes: { tone: 'blue' },
    });
    expect(
      codes([...BASE, 'variant two "2" from one', '  set c tone=blue', 'variant one "1"', '  node x "X"']),
    ).toEqual(['L116']);
    expect(codes([...BASE, 'variant two "2" from nothing', '  set c tone=blue'])).toEqual(['L107']);
  });
});

describe('the findings about variants', () => {
  const variant = (...lines: string[]) => codes([...BASE, 'variant v "V"', ...lines.map((l) => `  ${l}`)]);

  it('drop matches exactly one line: L112 for none, L113 for several', () => {
    expect(variant('drop node z')).toEqual(['L112']);
    expect(variant('drop node')).toEqual(['L113']);
    expect(variant('drop flow f')).toEqual([]);
    const found = unfolded([...BASE, 'variant v "V"', '  drop node']).diagnostics[0];
    expect(found && formatDiagnostic(found)).toContain('for example `drop node a`');
  });

  it('a dropped id may not be referred to any more (L114)', () => {
    expect(variant('drop node c')).toEqual(['L114']);
    expect(variant('drop node c', 'drop flow f')).toEqual([]);
    expect(variant('drop node a', 'drop flow f')).toEqual([]);
    expect(variant('drop group shop')).toEqual(['L114', 'L114']);
    expect(variant('drop node b', 'drop flow f', 'drop node a', 'drop node c')).toEqual([]);
  });

  it('set changes something (L115) of a declared id (L107), checked against the target’s table (L105)', () => {
    expect(variant('set c')).toEqual(['L115']);
    expect(variant('set z tone=blue')).toEqual(['L107']);
    expect(variant('set c colour=blue')).toEqual(['L105']);
    expect(variant('set c tone=blue in shop')).toEqual([]);
  });

  it('a variant may not declare an id the picture has (L117), and knows only the kind’s statements (L101)', () => {
    expect(variant('node c "C again"')).toEqual(['L117']);
    expect(variant('drop node c', 'node c "C again"')).toEqual([]);
    expect(variant('drop node c', 'container c "C again"')).toEqual(['L101', 'L114']);
    expect(variant('variant w "W"')).toEqual(['L101']);
  });

  it('variant ids are unique (L108)', () => {
    expect(codes([...BASE, 'variant v "V"', '  set c tone=blue', 'variant v "W"', '  set c tone=green'])).toEqual([
      'L108',
    ]);
  });
});

describe('the statements every kind has', () => {
  it('are in the grammar of every kind, set and drop inside variant, with examples that unfold cleanly', () => {
    const grammar = grammarOf(board);
    expect(grammar.statements.map((s) => s.keyword).slice(-2)).toEqual(['use', 'variant']);
    const variant = grammar.statements.at(-1) as GrammarStatement;
    expect(variant.children.map((c) => c.keyword).slice(-2)).toEqual(['set', 'drop']);
    const examples = [
      'variant target "Target" diff',
      '  set c tone=green',
      '  drop flow f',
      'variant a "A" from target',
      '  drop node c',
    ];
    expect(codes([...BASE, ...examples])).toEqual([]);
  });

  it('may not be declared by a kind itself', () => {
    const own = statement('variant', { doc: 'A variant of my own.', examples: ['variant'] });
    expect(checkKind(kind('mine', { doc: 'Mine.', statements: [own] }))).toContain(
      'statement variant takes a keyword every kind has',
    );
  });
});

describe('a picture without diff', () => {
  it('carries no origin, so it reads like the file written out by hand', () => {
    const lines = [...BASE, 'variant v "V"', '  set b tone=green', '  node x "X"'];
    expect(picture(lines)?.statements.filter((s) => s.origin !== undefined)).toEqual([]);
  });
});
