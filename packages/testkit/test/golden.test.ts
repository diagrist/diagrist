import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { compareGolden } from '../src/index.js';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'diagrist-golden-'));
});

describe('compareGolden', () => {
  it('matches identical output', () => {
    const file = join(dir, 'a.svg');
    writeFileSync(file, '<svg/>');
    expect(compareGolden(file, '<svg/>', { update: false })).toEqual({ status: 'match' });
  });

  it('reports the first differing position with context', () => {
    const file = join(dir, 'a.svg');
    writeFileSync(file, '<svg width="10"/>');
    const result = compareGolden(file, '<svg width="12"/>', { update: false });
    expect(result).toMatchObject({ status: 'mismatch', firstDifference: 13 });
  });

  it('treats a missing golden as a failure unless asked to create it', () => {
    const file = join(dir, 'missing.svg');
    expect(compareGolden(file, '<svg/>', { update: false }).status).toBe('mismatch');
    expect(compareGolden(file, '<svg/>', { update: false, createMissing: true })).toEqual({
      status: 'written',
      reason: 'missing',
    });
    expect(readFileSync(file, 'utf8')).toBe('<svg/>');
  });

  it('overwrites on update', () => {
    const file = join(dir, 'a.svg');
    writeFileSync(file, 'old');
    expect(compareGolden(file, 'new', { update: true })).toEqual({ status: 'written', reason: 'update' });
    expect(readFileSync(file, 'utf8')).toBe('new');
  });
});
