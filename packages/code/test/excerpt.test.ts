import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { type CodeLine, type Excerpt, excerpt, highlight, outline } from '../src/index.js';

const read = (name: string): CodeLine[] =>
  highlight({ path: name, text: readFileSync(new URL(`fixtures/${name}`, import.meta.url), 'utf8') });

const service = read('TransferService.java');
const outbox = read('Outbox.java');

/** Each line of an excerpt as `<number> <text>`, or what it missed. */
function shown(cut: Excerpt): string[] | Excerpt {
  return 'lines' in cut ? cut.lines.map((line) => `${line.number} ${line.text}`) : cut;
}

describe('excerpt by symbol', () => {
  it('takes a method with its annotation to the closing brace, dedented, with the numbers of the file', () => {
    const lines = shown(excerpt(service, { symbol: 'submit' })) as string[];
    expect(lines[0]).toBe('25 @Transactional');
    expect(lines[1]).toBe('26 public TransferId submit(SubmitTransfer cmd) {');
    expect(lines.at(-1)).toBe('36 }');
    expect(lines).toHaveLength(12);
  });

  it('takes a type with its doc comment and annotation above it, to its own closing brace', () => {
    const lines = shown(excerpt(service, { symbol: 'TransferService' })) as string[];
    expect(lines.slice(0, 2)).toEqual([
      '8 /**',
      '9  * Accepts transfers from the online banking: checks the limit, books the',
    ]);
    expect(lines.at(-1)).toBe('44 }');
  });

  it('does not take a name the file only calls, and says what it declares and which is closest', () => {
    expect(excerpt(service, { symbol: 'findById' })).toEqual({
      missing: 'symbol',
      found: ['TransferService', 'submit', 'status'],
      last: 44,
    });
    expect(excerpt(service, { symbol: 'submitt' })).toMatchObject({ missing: 'symbol', nearest: 'submit' });
  });

  it('ignores braces in strings and comments when it looks for the end', () => {
    const code = ['class A {', '  void a() {', '    log("}");', '    // }', '  }', '  void b() {}', '}'].join('\n');
    expect(shown(excerpt(highlight({ path: 'A.java', text: code }), { symbol: 'a' }))).toEqual([
      '2 void a() {',
      '3   log("}");',
      '4   // }',
      '5 }',
    ]);
  });

  it('ends a Kotlin declaration without body where its parentheses close or its expression ends', () => {
    const code = ['data class Money(', '    val cents: Long,', ')', '', 'fun total() = 1', 'fun next() {}'].join('\n');
    const kotlin = highlight({ path: 'Money.kt', text: code });
    expect(shown(excerpt(kotlin, { symbol: 'Money' }))).toEqual([
      '1 data class Money(',
      '2     val cents: Long,',
      '3 )',
    ]);
    expect(shown(excerpt(kotlin, { symbol: 'total' }))).toEqual(['5 fun total() = 1']);
  });
});

describe('excerpt by region and lines', () => {
  it('takes the lines between the markers, without them, and leaves the region marker out of a symbol', () => {
    const lines = shown(excerpt(outbox, { region: 'publish' })) as string[];
    expect(lines[0]).toBe('17 /** Writes the event in the same transaction; the relay sends it after the commit. */');
    expect(lines.at(-1)).toBe('23 }');
    expect((shown(excerpt(outbox, { symbol: 'publish' })) as string[])[0]).toMatch(/^17 /);
  });

  it('reads markers in the comments of any language and lets a nested region end inside', () => {
    const code = [
      '<!-- #region deps -->',
      '<a/>',
      '<!-- #region inner -->',
      '<b/>',
      '<!-- #endregion -->',
      '<c/>',
      '<!-- #endregion -->',
      '<d/>',
    ].join('\n');
    const xml = highlight({ path: 'pom.xml', text: code });
    expect(shown(excerpt(xml, { region: 'deps' }))).toEqual(['2 <a/>', '4 <b/>', '6 <c/>']);
    const sql = highlight({ path: 'q.sql', text: '-- #region find\nSELECT 1;\n-- #endregion\n' });
    expect(shown(excerpt(sql, { region: 'find' }))).toEqual(['2 SELECT 1;']);
  });

  it('names the regions a file marks when the one asked for is missing', () => {
    expect(excerpt(outbox, { region: 'publsh' })).toEqual({
      missing: 'region',
      found: ['publish'],
      nearest: 'publish',
      last: outbox.length,
    });
  });

  it('takes a range of lines, both ends included, and refuses one outside the file with its length', () => {
    expect(shown(excerpt(service, { lines: [27, 28] }))).toEqual([
      '27 var existing = transfers.findByIdempotencyKey(cmd.idempotencyKey());',
      '28 if (existing.isPresent()) {',
    ]);
    expect(excerpt(service, { lines: [40, 45] })).toEqual({ missing: 'lines', found: [], last: 44 });
    expect(excerpt(service, { lines: [5, 4] })).toMatchObject({ missing: 'lines' });
  });
});

describe('outline', () => {
  it('keeps declarations, fields and annotations, folds member bodies and counts what they hide', () => {
    const lines = outline(service).map(
      (line) => `${line.number} ${line.text}${line.folded ? ` [${line.folded}]` : ''}`,
    );
    expect(lines).toEqual([
      '12 @Service',
      '13 public class TransferService {',
      '15     private final TransferRepository transfers;',
      '16     private final LimitCheck limits;',
      '17     private final Outbox outbox;',
      '19     public TransferService(TransferRepository transfers, LimitCheck limits, Outbox outbox) { … } [4]',
      '25     @Transactional',
      '26     public TransferId submit(SubmitTransfer cmd) { … } [10]',
      '38     @Transactional(readOnly = true)',
      '39     public TransferStatus status(TransferId id) { … } [4]',
      '44 }',
    ]);
    expect(outline(service)[7]?.runs.at(-1)).toEqual({ text: ' … }', role: 'codeFold' });
  });
});
