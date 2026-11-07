import type { Rect } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import type { Group, Link } from '../src/layered/links.js';
import { portsOf } from '../src/layered/ports.js';

const NONE = { dummies: new Set<string>() };
const rect = (cx: number, w: number): Rect => ({ x: cx - w / 2, y: 0, w, h: 40 });
const link = (upper: string, lower: string): Link => ({ edge: `${upper}-${lower}`, upper, lower, gap: 0 });

describe('the ends of a side', () => {
  /** A box 48 wide at 200 over four members far to its right, as a choice over its branches. */
  const fanned = () => {
    const members = { a: 332, b: 508, c: 692, d: 876 };
    const links = Object.keys(members).map((m) => link('z', m));
    const x = new Map([['z', 200], ...Object.entries(members)]);
    const rects = new Map([
      ['z', rect(200, 48)],
      ...Object.entries(members).map(([id, cx]) => [id, rect(cx, 96)] as const),
    ]);
    const groups: Group[] = [{ kind: 'fan', links }];
    return { groups, rects, x, trunk: links[0] as Link };
  };

  it('take a trunk on a diamond to its tip when no member stands within its reach', () => {
    const { groups, rects, x, trunk } = fanned();
    const tip = (box: string) => (box === 'z' ? { shape: 'diamond' as const } : undefined);
    const ports = portsOf(groups, NONE, rects, x, 16, undefined, undefined, undefined, [], [], undefined, tip);
    expect(ports.bottom.get(trunk)).toBe(200);
  });

  it('let a trunk on any other box lean toward its members up to the inset', () => {
    const { groups, rects, x, trunk } = fanned();
    const ports = portsOf(groups, NONE, rects, x, 16);
    expect(ports.bottom.get(trunk)).toBe(212);
  });

  /** Three ends on the top of a box 200 wide: the first wants past its left inset, the last its right one. */
  const shifted = (corner?: number) => {
    const uppers = { u: -100, v: 0, w: 300 };
    const links = Object.keys(uppers).map((u) => link(u, 'b'));
    const x = new Map([['b', 100], ...Object.entries(uppers)]);
    const rects = new Map([
      ['b', rect(100, 200)],
      ...Object.entries(uppers).map(([id, cx]) => [id, rect(cx, 100)] as const),
    ]);
    const node = (box: string) => (box === 'b' && corner !== undefined ? { corner } : undefined);
    const singles = links.map((l): Group => ({ kind: 'single', links: [l] }));
    const ports = portsOf(singles, NONE, rects, x, 16, undefined, undefined, undefined, [], [], undefined, node);
    return links.map((l) => ports.top.get(l) ?? 0);
  };

  it('stay off a rounded corner when the row is shifted back off the other one', () => {
    for (const at of [shifted(), shifted(16)]) {
      expect(Math.min(...at)).toBeGreaterThanOrEqual(16);
      expect(Math.max(...at)).toBeLessThanOrEqual(184);
    }
  });

  it('may come nearer a square corner, where no rounding is in the way', () => {
    expect(Math.max(...shifted(0))).toBe(192);
  });
});
