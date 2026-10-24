import { describe, expect, it } from 'vitest';
import { scan } from '../src/index.js';

const tokens = (source: string) => scan(source).lines[0]?.tokens.map((t) => [t.kind, t.value]);

describe('scan', () => {
  it('splits a line into words, texts, attributes and operators', () => {
    expect(tokens('edge a -> b "calls" style=dashed')).toEqual([
      ['word', 'edge'],
      ['word', 'a'],
      ['operator', '->'],
      ['word', 'b'],
      ['text', 'calls'],
      ['attribute', 'dashed'],
    ]);
  });

  it('prefers the longest operator', () => {
    expect(tokens('a --|> b')?.[1]).toEqual(['operator', '--|>']);
    expect(tokens('a --> b')?.[1]).toEqual(['operator', '-->']);
  });

  it('keeps arrows inside words as words', () => {
    expect(tokens('note a->b')?.[1]).toEqual(['word', 'a->b']);
  });

  it('unescapes quotes and backslashes in texts and quoted attributes', () => {
    const [, text, attribute] = scan('note "say \\"hi\\"" label="a \\\\ b"').lines[0]?.tokens ?? [];
    expect(text?.value).toBe('say "hi"');
    expect(attribute).toMatchObject({ key: 'label', value: 'a \\ b', quoted: true });
  });

  it('reports 1-based positions', () => {
    const [, second] = scan('  node api').lines[0]?.tokens ?? [];
    expect(second?.span).toEqual({ line: 1, column: 8, length: 3 });
  });

  it('keeps comments, but not a # inside text', () => {
    const [line] = scan('node api "C# service" # owned by team a').lines;
    expect(line?.tokens.at(-1)?.value).toBe('C# service');
    expect(line?.comment?.text).toBe(' owned by team a');
  });

  it('turns an unterminated text into a token and an error, so the file can still be read', () => {
    const result = scan('node api "half\nnode db');
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]?.tokens.at(-1)).toMatchObject({ kind: 'text', value: 'half' });
    expect(result.diagnostics).toMatchObject([{ code: 'L001', severity: 'error', span: { line: 1, column: 10 } }]);
  });

  it('warns about tabs in the indent', () => {
    expect(scan('\tnode api').diagnostics).toMatchObject([{ code: 'L003', severity: 'warning' }]);
  });

  it('rejects a character XML cannot hold at its column, once per line (L005)', () => {
    const found = (source: string) =>
      scan(source).diagnostics.map((d) => [d.code, d.span.line, d.span.column, d.values.found]);
    expect(found('note "a\u0001b" "\u001b"')).toEqual([['L005', 1, 8, 'U+0001']]);
    expect(found('note "\ud800"\nnote "\uffff"')).toEqual([
      ['L005', 1, 7, 'U+D800'],
      ['L005', 2, 7, 'U+FFFF'],
    ]);
    expect(found('note "a\tb \u{1F600} \u0085 \ufeff" # \u00e4')).toEqual([]);
  });

  it('ends a line at LF, CRLF and a lone CR', () => {
    const lines = scan('a\nb\r\nc\rd').lines.map((line) => [line.number, line.tokens[0]?.value]);
    expect(lines).toEqual([
      [1, 'a'],
      [2, 'b'],
      [3, 'c'],
      [4, 'd'],
    ]);
  });
});
