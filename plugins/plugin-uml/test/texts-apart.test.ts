import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { closestTexts, drawn } from './compile.js';

/**
 * Texts of different lines keep the gap of a foreign line. The same check on `stadtwerke`, the heaviest use case
 * example, runs in `usecase-examples.test.ts` on the compilation that file keeps, so it is not laid out twice.
 */
describe('texts of different lines', () => {
  it.each([
    ['stress/usecase/lange-namen.dgr', 'end texts of two crossing lines, where the one seated first gives way'],
    ['stress/class/rollen-viele.dgr', 'multiplicities at the corner of a class, where a spot further along is free'],
  ])('keep the gap of a foreign line in %s: %s', (path) => {
    expect(closestTexts(drawn(readFileSync(new URL(path, import.meta.url), 'utf8')))).toBeGreaterThanOrEqual(12);
  });
});
