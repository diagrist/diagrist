import { describe, expect, it } from 'vitest';
import { read, type Statement } from '../src/index.js';

const shape = (statements: readonly Statement[]): unknown[] =>
  statements.map((s) => (s.children.length > 0 ? [s.keyword, shape(s.children)] : s.keyword));

describe('read', () => {
  it('nests indented lines under the nearest less indented statement', () => {
    const source = ['diagram sequence "Login"', 'alt', '  msg a -> b', '  else', '    msg b -> a', 'note "x"'];
    const { document } = read(source.join('\n'));
    expect(shape(document.statements)).toEqual(['diagram', ['alt', ['msg', ['else', ['msg']]]], 'note']);
  });

  it('separates arguments from attributes and keeps both in source order', () => {
    const [statement] = read('node api "API" tone=blue in backend').document.statements;
    expect(statement?.arguments.map((a) => a.value)).toEqual(['api', 'API', 'in', 'backend']);
    expect(statement?.attributes.map((a) => [a.key, a.value])).toEqual([['tone', 'blue']]);
  });

  it('attaches comments above and at the end of a line, and keeps trailing comments', () => {
    const source = ['# the gateway', '# owned by platform', 'node api # public', '', '# end'];
    const { document } = read(source.join('\n'));
    const [api] = document.statements;
    expect(api?.comments.above.map((c) => c.text.trim())).toEqual(['the gateway', 'owned by platform']);
    expect(api?.comments.inline?.text.trim()).toBe('public');
    expect(document.trailingComments.map((c) => c.text.trim())).toEqual(['end']);
  });

  it('remembers where blank lines separated statements', () => {
    const { document } = read('node a\n\n\nnode b\nnode c');
    expect(document.statements.map((s) => s.blankLineBefore)).toEqual([false, true, false]);
  });

  it('returns the tree even when lines have errors', () => {
    const { document, diagnostics } = read('node a\n"no keyword"\nnode b "half');
    expect(document.statements.map((s) => s.keyword)).toEqual(['node', 'node']);
    expect(diagnostics.map((d) => d.code)).toEqual(['L001', 'L002']);
  });

  it('warns about an attribute that is set twice', () => {
    const { diagnostics } = read('node api tone=blue tone=red');
    expect(diagnostics).toMatchObject([{ code: 'L004', severity: 'warning', values: { key: 'tone' } }]);
  });
});

describe('entries', () => {
  const source = ['class ticket "Ticket" abstract', '  "- number : Integer"', '  "+ total() : Money" abstract'];

  it('reads indented lines that start with a text as entries of the statement above', () => {
    const [ticket] = read(source.join('\n')).document.statements;
    expect(ticket?.entries.map((e) => e.text)).toEqual(['- number : Integer', '+ total() : Money']);
    expect(ticket?.entries[1]?.arguments.map((a) => a.value)).toEqual(['abstract']);
    expect(ticket?.children).toEqual([]);
  });

  it('keeps statements and entries apart under the same parent', () => {
    const [ticket] = read([...source, '  note "audited"'].join('\n')).document.statements;
    expect(ticket?.entries).toHaveLength(2);
    expect(ticket?.children.map((c) => c.keyword)).toEqual(['note']);
  });

  it('rejects a text line at the top level, where no statement can own it', () => {
    expect(read('"- number : Integer"').diagnostics.map((d) => d.code)).toEqual(['L002']);
  });

  it('reads 64 levels and reports a deeper statement once, leaving it and its lines out (L006)', () => {
    const nested = (levels: number) => Array.from({ length: levels }, (_, level) => `${'  '.repeat(level)}alt`);
    const depth = (statements: readonly Statement[]): number =>
      Math.max(0, ...statements.map((s) => 1 + depth(s.children)));
    const deepest = read(nested(64).join('\n'));
    expect(deepest.diagnostics).toEqual([]);
    expect(depth(deepest.document.statements)).toBe(64);
    const tooDeep = read([...nested(1500), 'note "after"'].join('\n'));
    expect(tooDeep.diagnostics).toMatchObject([
      { code: 'L006', span: { line: 65, column: 129 }, values: { limit: '64' } },
    ]);
    expect(depth(tooDeep.document.statements)).toBe(64);
    expect(tooDeep.document.statements.map((s) => s.keyword)).toEqual(['alt', 'note']);
  });
});
