import { compile, type Drawing, type Placed } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { architecturePlugin } from '../src/index.js';
import { source } from './compile.js';

/** The rectangles the kind placed in the base picture of `text`. */
function placedOf(text: string): readonly Placed[] {
  const drawn: Drawing[] = [];
  const plugin = {
    ...architecturePlugin,
    kinds: architecturePlugin.kinds.map((k) => ({
      ...k,
      layout: (m: never, c: never) => {
        const d = k.layout(m, c);
        drawn.push(d);
        return d;
      },
    })),
  };
  compile(text, { plugins: [plugin] });
  return drawn[0]?.placed ?? [];
}

const crosses = (r: Placed['rect'], f: Placed['rect']): boolean => {
  const meets = r.x < f.x + f.w && r.x + r.w > f.x && r.y < f.y + f.h && r.y + r.h > f.y;
  const inside = r.x >= f.x && r.y >= f.y && r.x + r.w <= f.x + f.w && r.y + r.h <= f.y + f.h;
  return meets && !inside;
};

describe('decision marks at nodes of a fixed grid', () => {
  it('stand clear of the line of a frame and are reported to the placement check as <node>.mark', () => {
    const placed = placedOf(source('radverleih/komponenten.dgr'));
    const mark = placed.find((p) => p.key === 'schloss.mark');
    const frame = placed.find((p) => p.key === 'backend');
    if (!mark || !frame) throw new Error('missing');
    expect(crosses(mark.rect, frame.rect)).toBe(false);
    expect(mark.kind).toBe('text');
  });
});
