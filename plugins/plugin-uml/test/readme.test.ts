import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compareGolden } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { withCodeTables } from './codes.js';

const path = fileURLToPath(new URL('../README.md', import.meta.url));

describe('the README', () => {
  it('lists every rule code as the rules generate it (regenerate with `pnpm docs:uml`)', () => {
    const readme = readFileSync(path, 'utf8');
    const generated = withCodeTables(readme, umlPlugin) ?? '';
    expect(generated, 'the README lost the markers around its code tables').not.toBe('');
    expect(compareGolden(path, generated).status, 'README.md is out of date; run `pnpm docs:uml`').not.toBe('mismatch');
  });
});
