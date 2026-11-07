import { readFileSync } from 'node:fs';
import { compile } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';

const none = { x: 0, y: 0, w: 0, h: 0 };
const cy = (r: { y: number; h: number }) => r.y + r.h / 2;

describe('composite states and the lines around them', () => {
  const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
  const result = compile(source('stress/state/gedaechtnis.dgr'), { plugins: [umlPlugin] });
  const a = result.anchors;
  const node = (id: string) => a?.nodes.find((n) => n.id === id)?.rect ?? none;
  const edge = (from: string, to: string) => a?.edges.find((e) => e.from === from && e.to === to)?.points ?? [];
  const frame = a?.groups.find((g) => g.id === 'programm')?.rect ?? none;

  it('puts a history state entered only from below at the bottom of its composite state', () => {
    expect(result.diagnostics).toEqual([]);
    expect(cy(node('zurueck'))).toBe(cy(node('schleudern')));
  });

  it('lets a line out of the bottom of a composite state run straight down to the state below', () => {
    expect(new Set(edge('programm', 'pause').map((q) => q[0])).size).toBe(1);
  });

  it('puts a state entered from a composite state and leaving back into it beside the composite state', () => {
    const [into, back] = [edge('programm', 'stoerung'), edge('stoerung', 'zurueck')];
    expect(node('stoerung').x).toBeGreaterThanOrEqual(frame.x + frame.w);
    expect(new Set(into.map((q) => q[1])).size).toBe(1);
    expect(new Set(back.map((q) => q[1])).size).toBe(1);
    expect(Math.abs((into[0]?.[1] ?? 0) - (back[0]?.[1] ?? 0))).toBeGreaterThanOrEqual(16);
  });

  it('runs no transition through a composite state it neither leaves nor enters', () => {
    const line = edge('stoerung', 'bereit');
    const within = (v: number, lo: number, hi: number) => v > lo && v < hi;
    const through = line.slice(1).some(([x, y], k) => {
      const [px, py] = line[k] ?? [x, y];
      const [x0, x1, y0, y1] = [Math.min(px, x), Math.max(px, x), Math.min(py, y), Math.max(py, y)];
      return x0 < frame.x + frame.w && x1 > frame.x && y0 < frame.y + frame.h && y1 > frame.y;
    });
    expect(line.length).toBeGreaterThan(2);
    expect(
      through || line.some(([x, y]) => within(x, frame.x, frame.x + frame.w) && within(y, frame.y, frame.y + frame.h)),
    ).toBe(false);
  });

  it('lets a line out of a composite state reach a state beside it as near the middle of that state as the frame allows', () => {
    const order = compile(source('../examples/state/auftragsabwicklung.dgr'), { plugins: [umlPlugin] }).anchors;
    const box = order?.nodes.find((n) => n.id === 'storniert')?.rect ?? none;
    const out = order?.groups.find((g) => g.id === 'bestaetigt')?.rect ?? none;
    const line = order?.edges.find((e) => e.from === 'bestaetigt' && e.to === 'storniert')?.points ?? [];
    expect(new Set(line.map((q) => q[0])).size).toBe(1);
    expect(box.x + box.w / 2).toBeLessThan(out.x);
    expect(line[0]?.[0]).toBeLessThanOrEqual(out.x + 16);
  });

  it('seats a trigger near the start of its line, clear of the frames that grow for the texts inside them', () => {
    const lift = compile(source('stress/state/verschachtelt.dgr'), { plugins: [umlPlugin] });
    const line = lift.anchors?.edges.find((e) => e.from === 'wartung' && e.to === 'betrieb')?.points ?? [];
    const y = Number(/<text[^>]* y="([\d.]+)"[^>]*>freigeben</.exec(lift.svg ?? '')?.[1]);
    const [start, end] = [line[0]?.[1] ?? 0, line.at(-1)?.[1] ?? 0];
    expect(lift.diagnostics).toEqual([]);
    expect(Math.abs(y - start)).toBeLessThan(Math.abs(y - end));
  });
});
