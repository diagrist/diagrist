import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type CodeLanguage, type CodeLine, highlight, languageOf } from '../src/index.js';

const JAVA = readFileSync(new URL('fixtures/TransferService.java', import.meta.url), 'utf8');
const java = highlight({ path: 'src/TransferService.java', text: JAVA });

/** The runs of a line as `role:text`, plain runs as their text alone. */
const runs = (line: CodeLine | undefined): string[] =>
  (line?.runs ?? []).map((run) => (run.role === undefined ? run.text : `${run.role}:${run.text}`));

/** The role of the first run holding `text` in the only line of a snippet. */
function roleIn(language: CodeLanguage, code: string, text: string): string | undefined {
  const [line] = highlight({ path: 'snippet', text: code }, language);
  return line?.runs.find((run) => run.text.includes(text))?.role;
}

describe('highlight', () => {
  it('numbers the lines of a file as an editor does, without a line after the last line end', () => {
    expect(java).toHaveLength(44);
    expect(java.map((line) => line.number)).toEqual(Array.from({ length: 44 }, (_, i) => i + 1));
    expect(java.map((line) => line.text).join('\n')).toBe(JAVA.trimEnd());
  });

  it('splits a Java line into runs with roles, operators and names plain, and joins runs of one role', () => {
    expect(runs(java[25])).toEqual([
      '    ',
      'codeKeyword:public ',
      'codeType:TransferId ',
      'codeFunction:submit',
      '(',
      'codeType:SubmitTransfer',
      ' cmd) {',
    ]);
    expect(runs(java[11])).toEqual(['codeAnnotation:@Service']);
    expect(runs(java[8])).toEqual([
      'codeComment: * Accepts transfers from the online banking: checks the limit, books the',
    ]);
  });

  it('lists the names a line declares and not the ones it calls', () => {
    expect(java[12]?.declares).toEqual(['TransferService']);
    expect(java[25]?.declares).toEqual(['submit']);
    expect(java[26]?.declares).toBeUndefined();
  });

  it.each([
    ['java', '/** @param id the order */', '@param', 'codeComment'],
    ['java', 'int n = 42;', '42', 'codeLiteral'],
    ['java', 'String s = "a { b";', '"a { b"', 'codeString'],
    ['kotlin', 'fun total(): Money = sum()', 'fun', 'codeKeyword'],
    ['kotlin', '@Service class Billing', '@Service', 'codeAnnotation'],
    ['sql', 'SELECT id FROM orders WHERE total > 10;', 'SELECT', 'codeKeyword'],
    ['sql', '-- open orders', 'open', 'codeComment'],
    ['yaml', 'batch-size: 100', 'batch-size', 'codeKey'],
    ['json', '{ "name": "x", "ok": true }', 'name', 'codeKey'],
    ['json', '{ "name": "x", "ok": true }', 'true', 'codeLiteral'],
    ['xml', '<dependency scope="test">', 'dependency', 'codeKey'],
    ['xml', '<!-- a note -->', 'a note', 'codeComment'],
  ] as const)('reads %s with its grammar: in `%s` the text %s is %s', (language, code, text, role) => {
    expect(roleIn(language, code, text)).toBe(role);
  });

  it('declares Kotlin functions and classes like Java ones', () => {
    const lines = highlight({ path: 'Billing.kt', text: 'data class Money(val cents: Long)\nfun total() = 1\n' });
    expect(lines.map((line) => line.declares)).toEqual([['Money'], ['total']]);
  });

  it('draws `text` as written, one plain run a line, and turns tabs into four spaces and CRLF into lines', () => {
    const lines = highlight({ path: 'notes.txt', text: 'a\tb\r\nif x {\r\n' });
    expect(lines.map((line) => line.runs)).toEqual([[{ text: 'a    b' }], [{ text: 'if x {' }]]);
  });

  it('takes the language from the extension unless it is given', () => {
    expect(['A.java', 'b.KT', 'c.kts', 'd.yml', 'e.xml', 'f.sql', 'g.json', 'h.ts'].map(languageOf)).toEqual([
      'java',
      'kotlin',
      'kotlin',
      'yaml',
      'xml',
      'sql',
      'json',
      'text',
    ]);
    expect(highlight({ path: 'Order.txt', text: 'class A {}' }, 'java')[0]?.runs[0]?.role).toBe('codeKeyword');
  });
});

describe('highlight on a slow machine', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('gives the same runs when every look at the clock is an hour later, since the time limit is off', () => {
    let now = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => {
      now += 3_600_000;
      return now;
    });
    const slow = highlight({ path: 'src/TransferService.java', text: JAVA });
    expect(slow).toEqual(java);
  });
});
