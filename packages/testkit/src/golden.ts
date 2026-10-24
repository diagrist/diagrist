import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/** Result of comparing a rendered output with its golden file. */
export type GoldenResult =
  | { status: 'match' }
  | { status: 'written'; reason: 'missing' | 'update' }
  | { status: 'mismatch'; firstDifference: number; expected: string; actual: string };

export interface GoldenOptions {
  /** Overwrite the golden file instead of comparing. Defaults to `process.env.UPDATE_GOLDEN === '1'`. */
  update?: boolean;
  /** Write the golden file if it does not exist yet. Defaults to `false`: a missing golden is a failure in CI. */
  createMissing?: boolean;
}

const CONTEXT = 40;

/**
 * Compares `actual` byte for byte with the golden file at `path`.
 *
 * A golden file is a reviewed reference output. The comparison only proves that nothing changed;
 * whether the reference is correct is the job of specific tests next to it.
 */
export function compareGolden(path: string, actual: string, options: GoldenOptions = {}): GoldenResult {
  const update = options.update ?? process.env.UPDATE_GOLDEN === '1';
  const exists = existsSync(path);

  if (update || (!exists && options.createMissing === true)) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, actual);
    return { status: 'written', reason: exists ? 'update' : 'missing' };
  }
  if (!exists) {
    return { status: 'mismatch', firstDifference: 0, expected: '<missing golden file>', actual: excerpt(actual, 0) };
  }

  const expected = readFileSync(path, 'utf8');
  if (expected === actual) return { status: 'match' };

  const at = firstDifference(expected, actual);
  return { status: 'mismatch', firstDifference: at, expected: excerpt(expected, at), actual: excerpt(actual, at) };
}

function firstDifference(a: string, b: string): number {
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    if (a[i] !== b[i]) return i;
  }
  return length;
}

function excerpt(text: string, at: number): string {
  return text.slice(Math.max(0, at - CONTEXT), at + CONTEXT);
}
