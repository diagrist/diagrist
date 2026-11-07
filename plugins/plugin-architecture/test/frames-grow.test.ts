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

  it('grows around a line on the lane below the last row between two of its boxes, with its text', () => {
    const cards = readFileSync(new URL('stress/c4/karten-icons.dgr', import.meta.url), 'utf8');
    const result = compile(cards, { plugins });
    const anchors = result.anchors;
    const editor = anchors?.nodes.find((n) => n.id === 'editor')?.rect;
    const frame = anchors?.groups.find((g) => g.id === 'plattform')?.rect;
    const line = anchors?.edges.find((e) => e.from === 'editor' && e.to === 'dateien');
    if (!editor || !frame || !line) throw new Error('missing parts of the picture');
    const lowest = Math.max(...line.points.map(([, y]) => y));
    expect(lowest).toBeGreaterThan(editor.y + editor.h);
    expect(lowest).toBeLessThan(frame.y + frame.h);
    expect(result.diagnostics.filter((d) => d.code.startsWith('G40'))).toEqual([]);
  });

  it('moves its centred head aside for a straight line into its top row (look=blocks)', () => {
    const blocks = readFileSync(new URL('stress/c4/bloecke.dgr', import.meta.url), 'utf8');
    const result = compile(blocks, { plugins });
    const line = result.anchors?.edges.find((e) => e.from === 'zuschauer' && e.to === 'gateway');
    expect(line?.points).toHaveLength(2);
    expect(result.diagnostics.filter((d) => ['G400', 'G411'].includes(d.code))).toEqual([]);
  });
});
