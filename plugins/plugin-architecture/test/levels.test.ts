import { checkPlugin, formatMessage } from '@diagrist/core';
import { grammarOf } from '@diagrist/lang';
import { describe, expect, it } from 'vitest';
import { architecturePlugin } from '../src/index.js';
import { codes, diagram, plugins } from './compile.js';

const keywords = (level: string) =>
  grammarOf(
    architecturePlugin.kinds.find((k) => k.spec.name === level)?.spec ?? {
      name: '',
      doc: '',
      header: {},
      statements: [],
    },
  ).statements.map((s) => s.keyword);

describe('the three C4 levels', () => {
  it('pass the checks of tables, docs, examples and messages', () => {
    expect(checkPlugin(architecturePlugin)).toEqual([]);
  });

  it('share one set of tables and differ only in the elements they allow', () => {
    expect(keywords('context')).toEqual([
      'grid',
      'layer',
      'group',
      'style',
      'person',
      'system',
      'node',
      'edge',
      'flow',
      'note',
      'adr',
      'use',
      'variant',
    ]);
    expect(keywords('container').filter((k) => !keywords('context').includes(k))).toEqual(['container']);
    expect(keywords('component').filter((k) => !keywords('context').includes(k))).toEqual(['container', 'component']);
    expect(keywords('component')).not.toContain('system');
  });

  it.each([
    ['context', 'container db "DB" at a/main'],
    ['context', 'component api "API" at a/main'],
    ['container', 'component api "API" at a/main'],
    ['component', 'system shop "Shop" at a/main'],
  ])('reject an element of another level: %s with `%s`', (level, line) => {
    const result = diagram(level, line);
    expect(codes(result)).toEqual(['L101']);
    const [found] = result.diagnostics;
    if (found) expect(formatMessage(found, plugins, 'en')).toContain('`person`');
  });

  it('let edges end at elements of the level and at groups, nothing else', () => {
    const ok = diagram(
      'container',
      'group g "G" own',
      'container db "DB" at a/main',
      'container x "X" at b/top in g',
      'edge db -> g "reads"',
    );
    expect(codes(ok).filter((c) => c.startsWith('L'))).toEqual([]);
    expect(codes(diagram('container', 'container db "DB" at a/main', 'edge db -> nobody "reads"'))).toEqual(['L107']);
  });

  it('read every arrow as its kind of edge, drawn by its role', () => {
    const svg =
      diagram(
        'context',
        'system a1 "A" at a/main',
        'system b1 "B" at c/main',
        'system c1 "C" at a/top',
        'edge a1 ~> b1 "event"',
        'edge c1 => a1 "data"',
      ).svg ?? '';
    expect(svg).toContain('class="line dashed" marker-end="url(#m-open)"');
    expect(svg).toContain('class="line-data" marker-end="url(#m-filled)"');
    expect(svg).toContain(
      '>asynchrones Domain-Event<'.replace('asynchrones Domain-Event', 'asynchronous domain event'),
    );
  });
});
