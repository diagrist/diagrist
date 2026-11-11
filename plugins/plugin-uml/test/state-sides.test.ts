import { compile, type Point, type Rect } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';

/** The machine of an approval: one state with four ways out, two of them only into the end (ADR 0040). */
const approval = (side: string, direction = 'down') =>
  [
    `diagram state "Approval" direction=${direction}`,
    'initial start',
    'state waiting "Waiting for confirmation"',
    'state confirmed "Confirmed"',
    'state claimed "Claimed"',
    'state declined "Declined"',
    'state cancelled "Cancelled"',
    'state expired "Expired"',
    'final end',
    'go start -> waiting do="send push"',
    'go waiting -> confirmed on="provider confirms"',
    `go waiting -> declined on="customer declines"${side}`,
    'go waiting -> cancelled on="creator cancels"',
    'go waiting -> expired on="deadline"',
    'go confirmed -> claimed on="claim"',
    'go confirmed -> expired on="deadline"',
    'go claimed -> end',
    'go declined -> end',
    'go cancelled -> end',
    'go expired -> end',
  ].join('\n');

/** The boxes of `waiting` and `declined` and the line between them, and the codes of the findings. */
function exit(source: string) {
  const result = compile(source, { plugins: [umlPlugin] });
  const a = result.anchors;
  const box = (id: string): Rect => a?.nodes.find((n) => n.id === id)?.rect ?? { x: 0, y: 0, w: 0, h: 0 };
  const route: readonly Point[] = a?.edges.find((e) => e.from === 'waiting' && e.to === 'declined')?.points ?? [];
  return { from: box('waiting'), to: box('declined'), route, codes: result.diagnostics.map((d) => d.code) };
}

const middleX = (r: Rect) => r.x + r.w / 2;
const middleY = (r: Rect) => r.y + r.h / 2;

describe('a transition with side=', () => {
  it('stands below its source without it', () => {
    const { from, to } = exit(approval(''));
    expect(to.y).toBeGreaterThan(from.y + from.h);
  });

  it('leaves the middle of the right side and runs straight into the middle of its target beside it', () => {
    const { from, to, route, codes } = exit(approval(' side=right'));
    expect(codes).toEqual([]);
    expect(route).toEqual([
      [from.x + from.w, middleY(from)],
      [to.x, middleY(to)],
    ]);
    expect(middleY(to)).toBe(middleY(from));
  });

  it('runs out of the left side with side=left', () => {
    const { from, to, route } = exit(approval(' side=left'));
    expect(route).toEqual([
      [from.x, middleY(from)],
      [to.x + to.w, middleY(to)],
    ]);
  });

  it('runs out of the bottom with side=below where the flow runs right, though the other side would spare a crossing', () => {
    const { from, to, route, codes } = exit(approval(' side=below', 'right'));
    expect(codes).toEqual(['G410']);
    expect(route).toEqual([
      [middleX(from), from.y + from.h],
      [middleX(to), to.y],
    ]);
  });
});
