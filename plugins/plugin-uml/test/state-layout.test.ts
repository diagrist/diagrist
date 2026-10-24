import { compile, type Rect } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { stateDiagram, stateSource } from './compile.js';

const inside = (a: Rect, b: Rect) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
const cx = (r: Rect) => r.x + r.w / 2;
const cy = (r: Rect) => r.y + r.h / 2;

/** Compiles an example and looks up vertices, frames and transitions of the picture. */
function picture(name: string) {
  const result = compile(stateSource(`${name}.dgr`), { plugins: [umlPlugin] });
  expect(result.diagnostics).toEqual([]);
  const a = result.anchors;
  const none = { x: 0, y: 0, w: 0, h: 0 };
  const node = (id: string) => a?.nodes.find((n) => n.id === id)?.rect ?? none;
  const frame = (id: string) => a?.groups.find((g) => g.id === id)?.rect ?? none;
  const edge = (from: string, to: string) => a?.edges.find((e) => e.from === from && e.to === to)?.points ?? [];
  return { svg: result.svg ?? '', node, frame, edge, nodes: a?.nodes ?? [] };
}

describe('state machine layout', () => {
  it('layers states from the initial pseudostate down, the final state last', () => {
    const p = picture('fahrgastraum');
    const ys = ['start', 'leer', 'niedrig', 'normal', 'hoch', 'ende'].map((id) => p.node(id).y);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
    expect(new Set(ys).size).toBe(ys.length);
  });

  it('runs back edges on rails beside the states and docks them at their sides', () => {
    const p = picture('fahrgastraum');
    const states = ['leer', 'niedrig', 'normal', 'hoch'].map(p.node);
    const left = Math.min(...states.map((r) => r.x));
    const right = Math.max(...states.map((r) => r.x + r.w));
    for (const [from, to] of [
      ['niedrig', 'leer'],
      ['hoch', 'niedrig'],
      ['normal', 'niedrig'],
    ]) {
      const route = p.edge(from as string, to as string);
      expect(route).toHaveLength(4);
      const rail = route[1]?.[0] ?? 0;
      expect(rail < left || rail > right, `${from} -> ${to}`).toBe(true);
      expect(route[1]?.[0]).toBe(route[2]?.[0]);
    }
  });

  it('draws a self transition as a loop outside a corner of its state', () => {
    const p = picture('fahrgastraum');
    const loop = p.edge('normal', 'normal');
    const r = p.node('normal');
    expect(loop).toHaveLength(5);
    const outside = loop.slice(1, 4).every(([x, y]) => x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h);
    expect(outside).toBe(true);
  });

  it('keeps substates and the inner start inside their composite state', () => {
    const p = picture('auftragsabwicklung');
    for (const id of ['lager', 'reserviert', 'kommissioniert', 'versandt'])
      expect(inside(p.node(id), p.frame('bestaetigt')), id).toBe(true);
    expect(inside(p.node('offen'), p.frame('bestaetigt'))).toBe(false);
  });

  it('stretches fork and join over their branches and separates regions by a dashed line', () => {
    const p = picture('auftrag-parallel');
    const bar = p.node('teilen');
    for (const id of ['offen', 'kommissioniert']) {
      const route = p.edge('teilen', id);
      expect(route).toHaveLength(2);
      expect(route[0]?.[0]).toBeGreaterThan(bar.x);
      expect(route[0]?.[0]).toBeLessThan(bar.x + bar.w);
    }
    const frame = p.frame('bearbeitung');
    const separator = /<line x1="([\d.]+)" y1="[\d.]+" x2="([\d.]+)" y2="([\d.]+)" class="line dashed"\/>/.exec(p.svg);
    expect(separator?.[1]).toBe(separator?.[2]);
    expect(Number(separator?.[3])).toBe(frame.y + frame.h);
    expect(Number(separator?.[1])).toBeGreaterThan(p.node('kommissioniert').x + p.node('kommissioniert').w);
    expect(Number(separator?.[1])).toBeLessThan(p.node('offen').x);
  });

  it('puts an exit point on the border of its state, facing its way out', () => {
    const p = picture('auftrag-parallel');
    const frame = p.frame('bearbeitung');
    expect(cx(p.node('storno'))).toBe(frame.x + frame.w);
    expect(p.edge('offen', 'storno').at(-1)?.[1]).toBe(cy(p.node('storno')));
  });

  it('joins points of neighbouring submachines by a straight line across the gap, from left to right', () => {
    const p = picture('bestellung-unterautomaten');
    const xs = ['start', 'warenkorb', 'kasse', 'versand', 'ende'].map((id) => p.node(id).x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    const [paid, parcel] = [p.node('bezahlt'), p.node('paket')];
    expect(cy(paid)).toBe(cy(parcel));
    expect(cx(paid)).toBe(p.node('kasse').x + p.node('kasse').w);
    expect(cx(parcel)).toBe(p.node('versand').x);
    expect(p.edge('bezahlt', 'paket')).toHaveLength(2);
  });

  it('draws a submachine state with its name and the machine it calls, and the symbol at the bottom right', () => {
    const p = picture('freigabe-unterautomat');
    expect(p.svg).toContain('>Prüfung : Bonitätsprüfung</text>');
    const box = p.node('pruefung');
    const icon = /<rect x="([\d.]+)" y="([\d.]+)" width="8" height="8" rx="[\d.]+" class="shape"\/>/.exec(p.svg);
    expect(Number(icon?.[2])).toBe(box.y + box.h - 7 - 8);
    expect(p.node('neukunde').y + 8).toBe(box.y);
  });

  it('breaks a long label between trigger, guard and effect, never inside them', () => {
    const r = stateDiagram(
      'initial s',
      'state a "A"',
      'state b "B"',
      'go s -> a',
      'go a -> b on="Prüfung beendet" when="Angaben vollständig" do="Bereitstellung starten"',
    );
    expect(r.svg).toMatch(
      />Prüfung beendet<\/text><text [^>]+>\[Angaben vollständig\]<\/text><text [^>]+>\/ Bereitstellung starten</,
    );
  });
});
