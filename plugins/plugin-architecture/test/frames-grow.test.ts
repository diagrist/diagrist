import { readFileSync } from 'node:fs';
import { compile } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { plugins } from './compile.js';

/** The stress picture of two flows, whose `Sortierung` from depot to scanner is a Z between two boxes of `netz`. */
const source = readFileSync(new URL('stress/c4/zwei-fluesse.dgr', import.meta.url), 'utf8');

describe('a frame of a fixed grid', () => {
  it('grows around a Z that crosses fewer lines in the gap outside it, and keeps its text inside', () => {
    const result = compile(source, { plugins });
    const anchors = result.anchors;
    const node = (id: string) => anchors?.nodes.find((n) => n.id === id)?.rect;
    const depot = node('depot');
    const netz = anchors?.groups.find((g) => g.id === 'netz')?.rect;
    const line = anchors?.edges.find((e) => e.from === 'depot' && e.to === 'scanner');
    if (!depot || !netz || !line) throw new Error('missing parts of the picture');
    const xs = line.points.map(([x]) => x);
    expect(Math.max(...xs)).toBeGreaterThan(depot.x + depot.w);
    expect(Math.max(...xs)).toBeLessThan(netz.x + netz.w);
    expect(result.diagnostics.filter((d) => d.code.startsWith('G40'))).toEqual([]);
  });
});
