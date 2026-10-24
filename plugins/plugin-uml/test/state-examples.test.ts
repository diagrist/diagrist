import { compile } from '@diagrist/core';
import { compareGolden } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { exampleHashes, golden, stateNames, stateSource } from './compile.js';

const plugins = [umlPlugin];

describe('state machine examples', () => {
  it('all keep their pictures, checked by a SHA-256 per example', () => {
    expect(compareGolden(golden('state-examples.sha256'), exampleHashes('state'))).toEqual({ status: 'match' });
  });

  it.each(stateNames)('%s compiles without findings, twice to the same bytes', (name) => {
    const first = compile(stateSource(name), { plugins });
    expect(first.diagnostics).toEqual([]);
    expect(first.svg).toBeDefined();
    expect(compile(stateSource(name), { plugins }).svg).toBe(first.svg);
  });

  it.each(['auftrag-parallel', 'freigabe-unterautomat'])('%s renders the reviewed picture', (name) => {
    const svg = compile(stateSource(`${name}.dgr`), { plugins }).svg ?? '';
    expect(compareGolden(golden(`state-${name}.svg`), svg)).toEqual({ status: 'match' });
  });

  it('describes a diagram in German as the predecessor did', () => {
    const text = compile(stateSource('auftrag-parallel.dgr'), { plugins }).description ?? '';
    expect(compareGolden(golden('state-auftrag-parallel.de.txt'), `${text}\n`)).toEqual({ status: 'match' });
  });

  it('writes picture texts and description in English without locale=', () => {
    const result = compile(stateSource('freigabe-unterautomat.dgr').replace(' locale=de', ''), { plugins });
    expect(result.svg).toContain('>State machine diagram (UML) · Auftrag</text>');
    const lines = result.description?.split('\n') ?? [];
    expect(lines[0]).toBe(
      'Auftrag. State machine diagram (UML) with 5 states, 4 pseudostates and final states and 9 transitions.',
    );
    expect(lines).toContain(
      'Submachine state Prüfung (defers Adresse geändert), calls the state machine Bonitätsprüfung in the file bonitaetspruefung.dgr; on its border entry point "Neukunde", exit point "Abgelehnt".',
    );
    expect(lines).toContain('In the state Freigegeben the time event "14 Tage passed" leads to Storniert.');
    expect(lines).toContain('Through exit point "Abgelehnt" the flow leaves Prüfung and goes to Storniert.');
  });
});
