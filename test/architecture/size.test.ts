import { describe, expect, it } from 'vitest';
import { readSource, sourceFiles } from './source.js';

/** Past this size a file usually does two things (docs/engineering.md). */
const MAX_LINES = 200;

/** Files allowed to be longer while they are split up. Do not add new files to this list. */
const BURN_DOWN: readonly string[] = [];

describe('source files', () => {
  it(`stay within ${MAX_LINES} lines`, () => {
    const offending = sourceFiles()
      .filter((file) => !BURN_DOWN.includes(file))
      .map((file) => ({ file, lines: readSource(file).split('\n').length }))
      .filter(({ lines }) => lines > MAX_LINES)
      .map(({ file, lines }) => `${file}: ${lines} lines`);
    expect(offending).toEqual([]);
  });
});
