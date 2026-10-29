import { createHash } from 'node:crypto';
import { compareGolden } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { compileExample, exampleNames } from './compile.js';

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const golden = (name: string): string => new URL(`__golden__/${name}`, import.meta.url).pathname;

describe('matrix examples', () => {
  it.each(exampleNames)('%s renders without findings, twice to the same bytes', (name) => {
    const first = compileExample(name);
    expect(first.diagnostics).toEqual([]);
    expect(first.svg).toBeDefined();
    expect(compileExample(name).svg).toBe(first.svg);
  });

  it('all render the reviewed bytes, checked by a SHA-256 per picture', () => {
    const hashes = exampleNames.map((name) => `${sha256(compileExample(name).svg ?? '')}  ${name}\n`).join('');
    expect(compareGolden(golden('examples.sha256'), hashes)).toEqual({ status: 'match' });
  });

  it('describes a RACI matrix in German, group by group and row by row, with its note', () => {
    expect(compileExample('radverleih/zustaendigkeiten.dgr').description).toBe(
      [
        'Matrix „Ausleihe: Zuständigkeiten“ mit 4 Zeilen und 4 Spalten, Skala RACI.',
        'Gruppe Vorgang.',
        'Rad ausleihen: durchführend Kunde; verantwortlich Stationsteam.',
        'Rad zurückgeben: durchführend Kunde; verantwortlich Stationsteam; informiert Kundenservice.',
        'Gruppe Nachlauf.',
        'Schaden regulieren: durchführend Stationsteam; verantwortlich Stationsteam; konsultiert Kundenservice; informiert Buchhaltung.',
        'Mahnung senden: durchführend Buchhaltung; verantwortlich Buchhaltung; informiert Kundenservice.',
        'Anmerkung 1 zu Schaden regulieren: Bei Schäden über 500 Euro entscheidet die Versicherung mit.',
      ].join(' '),
    );
  });
});
