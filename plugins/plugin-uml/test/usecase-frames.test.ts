import { readdirSync, readFileSync } from 'node:fs';
import { compile, type Rect, segmentMeetsRect } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { usecaseNames, usecaseSource } from './compile.js';

/** Room a line keeps from the frame of a subject it does not end in, as the price of the layout asks. */
const CLEAR = 6;

const stress = new URL('stress/usecase/', import.meta.url);
const pictures = [
  ...usecaseNames.map((name) => ({ name, source: usecaseSource(name) })),
  ...readdirSync(stress)
    .filter((f) => f.endsWith('.dgr'))
    .map((name) => ({ name: `stress/${name}`, source: readFileSync(new URL(name, stress), 'utf8') })),
].filter((p) => (p.source.match(/^subject /gm) ?? []).length > 1);

const within = (a: Rect, b: Rect) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;

describe('use case diagrams with several subjects', () => {
  it.each(pictures.map((p) => p.name))('%s: no line runs through or past a subject it does not end in', (name) => {
    const source = pictures.find((p) => p.name === name)?.source ?? '';
    const anchors = compile(source, { plugins: [umlPlugin] }).anchors;
    const rects = new Map((anchors?.nodes ?? []).map((n) => [n.id, n.rect]));
    const holds = (g: Rect, id: string) => {
      const r = rects.get(id);
      return r !== undefined && within(r, g);
    };
    const passes = (anchors?.edges ?? []).flatMap((e) =>
      (anchors?.groups ?? [])
        .filter((g) => !holds(g.rect, e.from) && !holds(g.rect, e.to))
        .filter((g) => e.points.slice(1).some((q, i) => segmentMeetsRect(e.points[i] ?? q, q, g.rect, CLEAR)))
        .map((g) => `${e.from} -- ${e.to} past ${g.id}`),
    );
    expect(passes).toEqual([]);
  });
});
