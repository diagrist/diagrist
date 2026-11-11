import type { Compilation } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { LOOKS } from '../src/looks/index.js';
import { diagram } from './compile.js';

/**
 * Share of a font's size above the baseline that capitals take, and below it that descenders take; estimates, so the
 * checks allow `SLACK` pixels.
 */
const CAP = 0.73;
const DESCENT = 0.25;
const SLACK = 1;

type CylinderLook = 'plain' | 'paper' | 'blocks';

/** The body of the cylinder `id` as drawn: its rectangle, the lid's radius, its texts and the box of its icon. */
function drawn(result: Compilation, id: string) {
  const rect = result.anchors?.nodes.find((n) => n.id === id)?.rect;
  const group = new RegExp(`<g id="node-${id}">(.*?)</g>\\n`).exec(result.svg ?? '')?.[1] ?? '';
  const ry = Number(/ A[\d.]+ ([\d.]+) /.exec(group)?.[1]);
  const texts = [...group.matchAll(/<text [^>]*y="([\d.]+)"[^>]*>([^<]*)<\/text>/g)].map((m) => ({
    y: Number(m[1]),
    text: m[2],
  }));
  const icon = /<svg x="[\d.]+" y="([\d.]+)" width="[\d.]+" height="([\d.]+)"/.exec(group);
  return { rect, ry, texts, icon: icon ? { y: Number(icon[1]), h: Number(icon[2]) } : undefined };
}

/** A container diagram with one cylinder `db`, laid out adaptively so it may have its own size. */
const withCylinder = (look: CylinderLook, attributes: string) =>
  diagram(
    `container look=${look} layout=adaptive`,
    `container db "Orders" tech="Postgres, schema" shape=db ${attributes} at b/main`,
  );

describe('a cylinder (shape=db)', () => {
  it.each<CylinderLook>(['plain', 'blocks'])('takes its size from height= and width= in look %s', (look) => {
    const { rect, ry } = drawn(withCylinder(look, 'height=96 width=240'), 'db');
    expect(rect).toMatchObject({ w: 240, h: 96 });
    expect(ry).toBeGreaterThan(0);
  });

  const cases = (['plain', 'paper', 'blocks'] as const).flatMap((look) =>
    ['', 'height=72', 'height=120 width=280', 'icon=database'].map((a) => [look, a] as const),
  );

  it.each(cases)('in look %s with `%s` sets its texts and icon in its body, clear of lid and base', (look, a) => {
    const { rect, ry, texts, icon } = drawn(withCylinder(look, a), 'db');
    if (!rect) throw new Error('no cylinder drawn');
    const fonts = LOOKS[look].fonts;
    const name = texts.find((t) => t.text === 'Orders');
    const tech = texts.find((t) => t.text === 'Postgres, schema');
    if (!name || !tech) throw new Error('texts missing');
    const lidFront = rect.y + 2 * ry;
    const baseTop = rect.y + rect.h - (look === 'blocks' ? 0 : ry);
    const nameSize = look === 'blocks' ? fonts.block.size : fonts.name.size;
    const top = name.y - CAP * nameSize;
    const bottom = tech.y + DESCENT * fonts.tech.size;
    expect(top).toBeGreaterThanOrEqual(lidFront - SLACK);
    expect(bottom).toBeLessThanOrEqual(baseTop + SLACK);
    expect(Math.abs(top - lidFront - (baseTop - bottom))).toBeLessThan(5);
    if (icon) {
      expect(icon.y).toBeGreaterThanOrEqual(lidFront);
      expect(icon.y + icon.h).toBeLessThanOrEqual(baseTop);
    }
  });
});
