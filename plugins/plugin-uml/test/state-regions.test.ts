import { readFileSync } from 'node:fs';
import { checkPlacement, compile, type Drawing, lineFindings, linesOfDrawing, type Plugin } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';

/** The drawing the state kind hands for `source`, recorded at its layout. */
function drawn(source: string): Drawing {
  const out: Drawing[] = [];
  const recorded: Plugin = {
    ...umlPlugin,
    kinds: umlPlugin.kinds.map((k) => ({
      ...k,
      layout: (m, c) => {
        const d = k.layout(m, c);
        out.push(d);
        return d;
      },
    })),
  };
  compile(source, { plugins: [recorded] });
  return out[0] as Drawing;
}

const source = readFileSync(new URL('../examples/state/auftrag-parallel.dgr', import.meta.url), 'utf8');

describe('orthogonal regions in the placement check', () => {
  const drawing = drawn(source);
  const placed = drawing.placed ?? [];
  const at = (key: string) => placed.find((p) => p.key === key);

  it('hands each region as a frame in its state, with its name as a text in it', () => {
    for (const region of ['zahlung', 'versand']) {
      expect(at(region), region).toMatchObject({ kind: 'frame', within: 'bearbeitung' });
      expect(at(`${region}.name`), region).toMatchObject({ kind: 'text', within: region });
    }
  });

  it('puts the states of a region and the texts of their lines into the region, and a point on a region border', () => {
    expect(at('offen')?.within).toBe('zahlung');
    expect(at('versandt')?.within).toBe('versand');
    const texts = placed.filter((p) => p.kind === 'text' && p.key.startsWith('go-4.label'));
    expect(texts.map((t) => t.within)).toEqual(texts.map(() => 'zahlung'));
    expect(['zahlung', 'versand']).toContain(at('storno')?.on);
    expect(checkPlacement(placed, drawing.anchors)).toEqual([]);
  });

  it('reports a region name a state covers, and a line through it', () => {
    const name = at('zahlung.name');
    const offen = at('offen');
    if (name === undefined || offen === undefined) throw new Error('missing region name or state');
    const covered = placed.map((p) => (p.key === name.key ? { ...p, rect: { ...offen.rect, w: name.rect.w } } : p));
    const found = checkPlacement(covered, drawing.anchors).map((d) => d.values);
    expect(found).toContainEqual(expect.objectContaining({ first: 'zahlung.name', second: 'offen' }));
    const line = drawing.anchors.edges.find((e) => e.from === 'offen');
    const [x, y] = line?.points[0] ?? [0, 0];
    const crossed = placed.map((p) =>
      p.key === name.key ? { ...p, rect: { x: x - 20, y: y + 20, w: 40, h: 12 } } : p,
    );
    const through = lineFindings(linesOfDrawing({ anchors: drawing.anchors, placed: crossed }), {});
    expect(through.some((f) => f.rule === 'through' && f.other === 'zahlung')).toBe(true);
  });
});
