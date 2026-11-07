import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { architecturePlugin } from '../src/index.js';
import { stressEntries } from './stress.js';

const raster = readFileSync(new URL('stress/c4/raster-5x6.dgr', import.meta.url), 'utf8');
const crossings = (source: string) =>
  stressEntries([architecturePlugin], 'raster-5x6.dgr', source).entries['raster-5x6.dgr']?.counts.crossings;

describe('routes of a fixed grid priced by the measure', () => {
  it('keep the ways the pricing chose where the picture with its texts is better, one by one (look=paper)', () => {
    const paper = raster.replace(/^(diagram .*)$/m, '$1 look=paper');
    expect(crossings(paper)).toBe(4);
  });
});
