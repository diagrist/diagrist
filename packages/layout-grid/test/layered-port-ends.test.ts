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
    const tip = (box: string) => box === 'z';
    const ports = portsOf(groups, NONE, rects, x, 16, undefined, undefined, undefined, [], [], undefined, tip);
    expect(ports.bottom.get(trunk)).toBe(200);
  });

  it('let a trunk on any other box lean toward its members up to the inset', () => {
    const { groups, rects, x, trunk } = fanned();
    const ports = portsOf(groups, NONE, rects, x, 16);
    expect(ports.bottom.get(trunk)).toBe(212);
  });

});
