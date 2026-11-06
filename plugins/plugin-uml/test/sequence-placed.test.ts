import { compile, type Drawing, linesOfDrawing, type Placed, type Plugin, type Rect } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';

/** The plugin with the layout recorded, so the test reads what the kernel was handed. */
const drawings: Drawing[] = [];
const recorded: Plugin = {
  ...umlPlugin,
  kinds: umlPlugin.kinds.map((k) => ({
    ...k,
    layout: (m, c) => drawings[drawings.push(k.layout(m, c)) - 1] as Drawing,
  })),
};

/** Compiles a sequence diagram and returns its diagnostics and the drawing its layout handed over. */
function drawn(...lines: string[]) {
  drawings.length = 0;
  const result = compile(['diagram sequence "Test"', ...lines].join('\n'), { plugins: [recorded] });
  return { result, drawing: drawings[0] as Drawing };
}

const holds = (outer: Rect, r: Rect) =>
  r.x >= outer.x && r.y >= outer.y && r.x + r.w <= outer.x + outer.w && r.y + r.h <= outer.y + outer.h;

const byKey = (placed: readonly Placed[] | undefined) => new Map((placed ?? []).map((p) => [p.key, p]));

describe('what sequence pictures hand to the placement check', () => {
  it('hands heads, frames, notes and message labels, each in the frame its event stands in', () => {
    const { drawing } = drawn(
      'frame "Outer"',
      'participant a "A"',
      'participant b "B"',
      'msg a ~> b "go"',
      'opt "maybe"',
      '  note "check" over=b',
      '  msg b ~> a "back"',
      'divider "Later"',
    );
    const placed = byKey(drawing.placed);
    const shape = (key: string) => [placed.get(key)?.kind, placed.get(key)?.within];
    expect(shape('sd')).toEqual(['frame', undefined]);
    expect(shape('sd.name')).toEqual(['text', 'sd']);
    expect(shape('a')).toEqual(['box', 'sd']);
    expect(shape('opt-1')).toEqual(['frame', 'sd']);
    expect(shape('opt-1.name')).toEqual(['text', 'opt-1']);
    expect(shape('opt-1.guard.1')).toEqual(['text', 'opt-1']);
    expect(shape('note-1')).toEqual(['box', 'opt-1']);
    expect(shape('label-0')).toEqual(['text', 'sd']);
    expect(shape('label-1')).toEqual(['text', 'opt-1']);
    expect(shape('divider-1')).toEqual(['box', 'sd']);
    expect(placed.get('note-1')?.span?.line).toBe(7);
  });

  it('ties each label to its message for the line check, and each message to its source line', () => {
    const { drawing } = drawn('participant a "A"', 'participant b "B"', 'msg a ~> b "go"', 'msg b ~> a "back"');
    expect(linesOfDrawing(drawing).labels?.map((l) => [l.key, l.edge])).toEqual([
      ['label-0', '0'],
      ['label-1', '1'],
    ]);
    expect(drawing.anchors.edges.map((e) => e.span?.line)).toEqual([4, 5]);
  });

  it('keeps the further texts of a message, such as a gate name, as texts of its line', () => {
    const { drawing } = drawn('frame "Outer"', 'participant a "A"', 'msg gate.in ~> a "call"');
    const input = linesOfDrawing(drawing);
    expect(input.labels?.map((l) => l.key)).toEqual(['label-0']);
    expect(input.texts?.find((t) => t.key === 'label-0.2')).toMatchObject({ owner: '0' });
  });

  it('draws a fragment around the head of a lifeline created in it, so the head does not stick out', () => {
    const { result, drawing } = drawn(
      'participant a "A"',
      'participant b "B"',
      'opt "maybe"',
      '  create a -> b "new B()"',
      '  msg a ~> b "use"',
    );
    const placed = byKey(drawing.placed);
    expect(result.diagnostics).toEqual([]);
    expect(placed.get('b')?.within).toBe('opt-1');
    expect(holds(placed.get('opt-1')?.rect as Rect, placed.get('b')?.rect as Rect)).toBe(true);
  });
});
