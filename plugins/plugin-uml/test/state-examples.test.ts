import { compile } from '@diagrist/core';
import { compareGolden } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { compiledOnce, examplePictures, golden, stateNames, stateSource } from './compile.js';

const plugins = [umlPlugin];
const pictures = examplePictures('state');

/**
 * The example whose layout takes a second or more. Each example is compiled once in this file: every test below reads
 * that compilation, and the SHA-256 golden keeps it the same from run to run instead of a second compilation.
 */
const HEAVY = new Set(['auftrag-parallel.dgr']);

describe('state machine examples', () => {
  const compiled = compiledOnce(stateSource);

  it.each(stateNames)('%s compiles without findings', (name) => {
    const first = compiled(name);
    expect(first.diagnostics).toEqual([]);
    expect(first.svg).toBeDefined();
    pictures.keep(name, first.svg ?? '');
  });

  it.each(stateNames.filter((name) => !HEAVY.has(name)))('%s compiles twice to the same bytes', (name) => {
    expect(compile(stateSource(name), { plugins }).svg).toBe(compiled(name).svg);
  });

  it('all keep their pictures, checked by a SHA-256 per example', () => {
    expect(compareGolden(golden('state-examples.sha256'), pictures.hashes())).toEqual({ status: 'match' });
  });

  it.each(['auftrag-parallel', 'freigabe-unterautomat'])('%s renders the reviewed picture', (name) => {
    const svg = compiled(`${name}.dgr`).svg ?? '';
    expect(compareGolden(golden(`state-${name}.svg`), svg)).toEqual({ status: 'match' });
  });

  it('describes a diagram in German as the predecessor did', () => {
    const text = compiled('auftrag-parallel.dgr').description ?? '';
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
