import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compile } from '@diagrist/core';
import { compareGolden } from '@diagrist/testkit';
import { describe, expect, it } from 'vitest';
import { architecturePlugin } from '../src/index.js';
import { withCodeTables } from './codes.js';

const path = fileURLToPath(new URL('../README.md', import.meta.url));

describe('the README', () => {
  it('lists every rule code as the rules generate it (regenerate with `pnpm docs:generate`)', () => {
    const readme = readFileSync(path, 'utf8');
    const generated = withCodeTables(readme, architecturePlugin) ?? '';
    expect(generated, 'the README lost the markers around its code tables').not.toBe('');
    expect(compareGolden(path, generated).status, 'README.md is out of date; run `pnpm docs:generate`').not.toBe(
      'mismatch',
    );
  });

  it('shows an example that compiles without findings', () => {
    const example = /```dgr\n([\s\S]*?)```/.exec(readFileSync(path, 'utf8'))?.[1] ?? '';
    const result = compile(example, { plugins: [architecturePlugin] });
    expect(result.diagnostics).toEqual([]);
    expect(result.svg).toContain('>Context diagram (C4 L1) · Bike rental</text>');
  });
});
