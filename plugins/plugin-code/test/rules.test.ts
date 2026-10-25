import { checkPlugin, formatMessage } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { codePlugin } from '../src/index.js';
import { codes, diagram, plugins } from './compile.js';

const SUBMIT = 'source submit "submit" src="TransferService.java" symbol=submit';

/** The first diagnostic of a diagram as an agent reads it, in English. */
const message = (...lines: string[]): string => {
  const [first] = diagram(...lines).diagnostics;
  return first === undefined ? '' : formatMessage(first, plugins);
};

describe('code diagram rules', () => {
  it('pass the plugin checks: docs, examples, a message per rule in every locale', () => {
    expect(checkPlugin(codePlugin)).toEqual([]);
  });

  it('S100: a card names its file', () => {
    expect(codes(diagram('source a "A" symbol=submit'))).toEqual(['S100']);
  });

  it('S101: a card selects its lines in one way at most', () => {
    expect(message('source a "A" src="TransferService.java" symbol=submit lines=1-3')).toBe(
      'The card `a` selects its lines in 2 ways (`symbol=`, `lines=`). Keep one: `symbol=` follows the code when it moves, `region=` next, `lines=` last.',
    );
  });

  it('S102: a symbol the file does not declare names what it declares and the nearest name', () => {
    expect(message('source a "A" src="TransferService.java" symbol=submitt')).toBe(
      'The card `a`: `ueberweisung/TransferService.java` declares no method or type `submitt`; did you mean `submit`? It declares: `TransferService`, `submit`, `status`. The file has 44 lines.',
    );
  });

  it('S102: a missing region names the regions, and lines past the end name the length', () => {
    expect(message('source a "A" src="Outbox.java" region=send')).toContain(
      'marks no region `send` with `#region send`. Its regions are: `publish`.',
    );
    expect(message('source a "A" src="outbox.sql" lines=10-20')).toBe(
      'The card `a`: `ueberweisung/outbox.sql` has no lines 10-20. The file has 14 lines.',
    );
  });

  it('S103: a mark names lines the card shows, counted as in the file', () => {
    expect(codes(diagram(SUBMIT, '  mark 34', '  mark 2-3 "outside"'))).toEqual(['S103']);
    expect(message(SUBMIT, '  mark 2-3')).toContain('which shows lines 25-36 of its file');
    expect(message(SUBMIT, '  mark 40')).toMatch(/^The mark `40` lies outside the card `submit`/);
  });

  it('S104: a link starts at a line its card shows and leads to another card', () => {
    const other = 'source b "B" src="Outbox.java" region=publish';
    expect(codes(diagram(SUBMIT, other, 'link submit 34 -> b'))).toEqual([]);
    expect(codes(diagram(SUBMIT, other, 'link submit 3 -> b', 'link b 19 -> b'))).toEqual(['S104', 'S104']);
  });

  it('S600 warns of a card too long to read, and the picture is still drawn', () => {
    const result = diagram('source a "A" src="TransferService.java"');
    expect(codes(result)).toEqual(['S600']);
    expect(result.svg).toBeDefined();
  });

  it('report nothing about marks and links of a card whose selection already failed', () => {
    const lines = ['source a "A" src="TransferService.java" symbol=nope', '  mark 1', 'link a 1 -> a2'];
    expect(codes(diagram(...lines, 'source a2 "B" src="Outbox.java"'))).toEqual(['S102']);
  });
});
