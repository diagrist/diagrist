import { compile } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { framesPassed, subjects } from './compile.js';
import { stressSet } from './stress.js';

/**
 * The fixtures of the stress set with several subjects. The examples are checked the same way in
 * `usecase-examples.test.ts`, from the compilation that file keeps, so no heavy picture is compiled twice for it.
 */
const { names, source } = stressSet(new URL('stress/usecase/', import.meta.url));
const pictures = names.filter((name) => subjects(source(name)) > 1);

describe('use case stress fixtures with several subjects', () => {
  it.each(pictures)('stress/%s: no line runs through or past a subject it does not end in', (name) => {
    expect(framesPassed(compile(source(name), { plugins: [umlPlugin] }))).toEqual([]);
  });
});
