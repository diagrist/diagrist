import { fileURLToPath } from 'node:url';
import { compareGolden } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { COMMANDS } from '../src/commands/all.js';
import { REFERENCE_PATH, reference } from '../src/commands/reference.js';

const path = fileURLToPath(new URL(`../../../${REFERENCE_PATH}`, import.meta.url));

describe('the command reference', () => {
  it(`in ${REFERENCE_PATH} is what the command tables generate (regenerate with \`pnpm docs:cli\`)`, () => {
    const result = compareGolden(path, reference(COMMANDS));
    expect(result.status, `${REFERENCE_PATH} is out of date; run \`pnpm docs:cli\``).not.toBe('mismatch');
  });

  it('names its source in the first line', () => {
    expect(reference(COMMANDS).split('\n')[0]).toMatch(
      /^<!-- Generated from .*packages\/cli\/src\/commands.*Do not edit/,
    );
  });
});
