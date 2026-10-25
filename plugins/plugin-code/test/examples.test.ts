import { createHash } from 'node:crypto';
import { compareGolden } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { compileCode, exampleNames } from './compile.js';

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const golden = (name: string): string => new URL(`__golden__/${name}`, import.meta.url).pathname;

describe('code examples', () => {
  it.each(exampleNames)('%s renders without findings, twice to the same bytes', (name) => {
    const first = compileCode(name);
    expect(first.diagnostics).toEqual([]);
    expect(first.svg).toBeDefined();
    expect(compileCode(name).svg).toBe(first.svg);
  });

  it('all render the reviewed bytes, checked by a SHA-256 per picture', () => {
    const hashes = exampleNames.map((name) => `${sha256(compileCode(name).svg ?? '')}  ${name}\n`).join('');
    expect(compareGolden(golden('examples.sha256'), hashes)).toEqual({ status: 'match' });
  });

  it('describes a diagram in German, card by card, mark by mark, link by link', () => {
    const text = compileCode('ueberweisung/aufruf.dgr').description ?? '';
    expect(text).toBe(
      [
        'Code-Diagramm „Vom Aufruf zur Tabelle“ mit 3 Karten.',
        'TransferService.submit: Java, Zeilen 25-36 aus TransferService.java.',
        'Marke 1, Zeile 34: Das Event geht an die Outbox.',
        'Outbox.publish: Java, Zeilen 17-23 aus Outbox.java.',
        'Marke 2, Zeilen 19-22: Eine Zeile in derselben Transaktion wie die Buchung.',
        'outbox_entry: SQL, Zeilen 3-10 aus outbox.sql.',
        'Zeile 34 von submit führt zu publish: outbox.publish(event).',
        'Zeile 19 von publish führt zu table: INSERT.',
      ].join(' '),
    );
  });
});
