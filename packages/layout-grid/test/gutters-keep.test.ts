import { DEFAULT_THRESHOLDS } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import {
  type EdgeLabel,
  type EdgeText,
  type GridSpec,
  gutterRoom,
  placeGrid,
  type Route,
  widen,
} from '../src/index.js';
import { spec } from './fixture.js';

describe('the room a gap of a channel grid keeps at its borders for texts (ADR 0038, D2)', () => {
  it('hands on the room a gap keeps at its borders, and only where it keeps any', () => {
    const s = spec('a b', 'r s', ['x@a/r', 'y@b/s']);
    const wider = widen(s, { cols: [0], rows: [0], keep: { cols: [[24, 0]], rows: [[0, 0]] } });
    expect(wider.cols).toEqual([{ name: 'a', keep: [24, 0] }, { name: 'b' }]);
    expect(wider.rows).toEqual(s.rows);
  });

  it('keeps what a text along a Z arm asks at the border the arm starts from, so the tracks move by all of it', () => {
    const s: GridSpec = { ...spec('a b', 'r1 r2', ['h@a/r1', 's@b/r2']), channels: true };
    const layout = placeGrid(s);
    const z = (lane: number): Route => ({
      edge: 'e0',
      points: [
        [240, 156],
        [lane, 156],
        [lane, 332],
        [376, 332],
      ],
      shape: 'Z',
      fromSide: 'right',
      toSide: 'left',
    });
    const text: EdgeText = { edge: 'e0', name: 'Bescheidversandstelle' };
    const near = gutterRoom(s, layout, [z(308)], [text], [0]);
    const [kept = 0, beyond] = near.keep?.cols[0] ?? [];
    expect(kept).toBeGreaterThan(0);
    expect([near.cols[0], beyond]).toEqual([s.metrics.colGap + kept, 0]);
    expect(placeGrid(widen(s, near)).gutters.cols[0]).toBe((layout.gutters.cols[0] ?? 0) + kept);
    const far = gutterRoom(s, layout, [z(280)], [text], [0]);
    const [none, held = 0] = far.keep?.cols[0] ?? [];
    expect([none, far.cols[0]]).toEqual([0, s.metrics.colGap + held]);
    expect(placeGrid(widen(s, far)).gutters.cols[0]).toBe(layout.gutters.cols[0]);
  });

  it('asks the gap of a lane a text stands too near, having no other way to grow, for room on its side', () => {
    const s: GridSpec = { ...spec('a b', 'r1 r2', ['h@a/r1', 's@b/r2']), channels: true };
    const layout = placeGrid(s);
    const z: Route = {
      edge: 'e0',
      points: [
        [240, 156],
        [308, 156],
        [308, 332],
        [376, 332],
      ],
      shape: 'Z',
      fromSide: 'right',
      toSide: 'left',
    };
    const text: EdgeText = { edge: 'e0', name: 'liest' };
    const label: EdgeLabel = {
      text: 'liest',
      x: 290,
      y: 244,
      anchor: 'middle',
      box: { x: 270, y: 234, w: 40, h: 12 },
      route: 0,
      part: 'name',
    };
    expect(gutterRoom(s, layout, [z], [text], [0]).cols).toEqual([0]);
    const room = gutterRoom(s, layout, [z], [text], [0], undefined, [label]);
    const [kept = 0] = room.keep?.cols[0] ?? [];
    expect(kept).toBeGreaterThanOrEqual(310 - (308 - DEFAULT_THRESHOLDS.labelClear - 1));
    expect(room.cols[0]).toBe(s.metrics.colGap + kept);
    expect(placeGrid(widen(s, room)).gutters.cols[0]).toBe(308 + kept);
  });
});
