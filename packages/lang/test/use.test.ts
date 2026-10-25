import { describe, expect, it } from 'vitest';
import { resolvePath } from '../src/index.js';
import { BASE, codes, unfolded } from './fixtures/board.js';

describe('use', () => {
  const base = BASE.join('\n');
  const using = (...lines: string[]) => ['diagram board "Paper"', ...lines];

  it('puts the lines and variants of the used file before the own ones, and lists it as a need', () => {
    const files = { 'd/base.dgr': `${base}\nvariant next "Next"\n  set c tone=green\n` };
    const result = unfolded(
      using('use "base.dgr"', 'node d "D"', 'variant mine "Mine" from next', '  drop node d'),
      files,
    );
    expect([...result.diagnostics, ...result.pictures.flatMap((p) => p.reading.diagnostics)]).toEqual([]);
    expect(result.needs.map((n) => n.path)).toEqual(['d/base.dgr']);
    expect(result.pictures.map((p) => p.variant)).toEqual([undefined, 'mine']);
    expect(result.pictures[0]?.reading.statements.map((s) => ('id' in s ? s.id : ''))).toEqual([
      'shop',
      'a',
      'b',
      'c',
      'f',
      'd',
    ]);
  });

  it('reports a missing file (L118), another kind (L110), a cycle (L111) and a late use (L109)', () => {
    expect(codes(using('use "base.dgr"'))).toEqual(['L118']);
    expect(unfolded(using('use "base.dgr"')).needs.map((n) => n.path)).toEqual(['d/base.dgr']);
    expect(codes(using('use "base.dgr"'), { 'd/base.dgr': 'diagram other "X"' })).toEqual(['L110']);
    const cycle = { 'd/base.dgr': 'diagram board "B"\nuse "main.dgr"' };
    expect(codes(using('use "base.dgr"'), cycle)).toEqual(['L111']);
    expect(codes(using('node d "D"', 'use "base.dgr"'), { 'd/base.dgr': base })).toEqual(['L109']);
  });

  it('names the used file on the spans of its findings', () => {
    const result = unfolded(using('use "base.dgr"'), { 'd/base.dgr': `${base}\nnode a "again"` });
    expect(result.pictures[0]?.reading.diagnostics.map((d) => [d.code, d.span.file])).toEqual([['L108', 'd/base.dgr']]);
  });

  it('reads only relative paths inside the host’s folder that name no hidden file (L119)', () => {
    expect(codes(using('use "/etc/base.dgr"'))).toEqual(['L119']);
    expect(codes(using('use "../../base.dgr"'))).toEqual(['L119']);
    expect(codes(using('use ".git/base.dgr"'))).toEqual(['L119']);
    expect(codes(using('use "../base.dgr"'), { 'base.dgr': base })).toEqual([]);
  });
});

describe('resolvePath', () => {
  it('resolves against the folder of the file and refuses what leaves it', () => {
    expect(resolvePath('a/b/main.dgr', '../c/x.dgr')).toEqual({ path: 'a/c/x.dgr' });
    expect(resolvePath('main.dgr', './x.dgr')).toEqual({ path: 'x.dgr' });
    expect(resolvePath('main.dgr', '../x.dgr')).toEqual({ problem: 'outside' });
    expect(resolvePath('/srv/me/main.dgr', 'sub/x.dgr')).toEqual({ path: '/srv/me/sub/x.dgr' });
    expect(resolvePath('/srv/me/main.dgr', '../x.dgr')).toEqual({ problem: 'outside' });
    expect(resolvePath('main.dgr', 'https://example.com/x.dgr')).toEqual({ problem: 'absolute' });
    expect(resolvePath('main.dgr', 'C:\\x.dgr')).toEqual({ problem: 'absolute' });
    expect(resolvePath('main.dgr', 'a/.env')).toEqual({ problem: 'hidden' });
  });
});

describe('a chain of use', () => {
  it('holds at most 16 files (L120)', () => {
    const chain = Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [`d/f${i}.dgr`, `diagram board "F${i}"\nuse "f${i + 1}.dgr"`]),
    );
    const result = unfolded(['diagram board "Main"', 'use "f0.dgr"'], chain);
    expect(result.diagnostics.map((d) => d.code)).toEqual(['L120']);
    expect(result.needs).toHaveLength(15);
  });
});
