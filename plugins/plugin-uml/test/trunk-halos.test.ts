import { readFileSync } from 'node:fs';
import { compile } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { umlPlugin } from '../src/index.js';
import { classSource, stateSource } from './compile.js';

type Pt = [number, number];

/** Half the width of a halo and of a line in the standard look. */
const HALO = 2;
const LINE = 0.75;

/** The subpaths of a path `d` of `M` and `L` commands. */
const subpaths = (d: string): Pt[][] =>
  d
    .split('M')
    .filter((s) => s.trim())
    .map((s) => s.split('L').map((p) => p.trim().split(/\s+/).map(Number) as Pt));

/** The halo and the line of each `edge-<k>` group of an SVG, in drawing order. */
function edgesOf(svg: string): { halo: Pt[][]; line: Pt[] }[] {
  return [...svg.matchAll(/<g id="edge-\d+">(.*?)<\/g>/g)].map((m) => {
    const paths = [...(m[1] ?? '').matchAll(/<path d="([^"]+)" class="([^"]+)"/g)];
    const halo = paths.find((p) => p[2]?.includes('halo'))?.[1] ?? '';
    const line = paths.find((p) => !p[2]?.includes('halo') && !p[2]?.includes('stub'))?.[1] ?? '';
    return { halo: subpaths(halo), line: subpaths(line)[0] ?? [] };
  });
}

/** Distance from `p` to the segment `a → b`, and whether `p` lies beside it rather than beyond an end. */
function toSegment(p: Pt, a: Pt, b: Pt): { d: number; beside: boolean } {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const len2 = dx * dx + dy * dy || 1;
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  const c = Math.min(1, Math.max(0, t));
  return { d: Math.hypot(p[0] - a[0] - c * dx, p[1] - a[1] - c * dy), beside: t >= 0 && t <= 1 };
}

/** Whether a halo with butt ends and round joins covers `p`. */
const covers = (halo: readonly Pt[][], p: Pt): boolean =>
  halo.some((run) =>
    run.some((b, k) => {
      const a = run[k - 1];
      if (a && toSegment(p, a, b).beside && toSegment(p, a, b).d < HALO - 0.05) return true;
      return k > 0 && k < run.length - 1 && Math.hypot(p[0] - b[0], p[1] - b[1]) < HALO - 0.05;
    }),
  );

const near = (line: readonly Pt[], p: Pt): boolean =>
  line.some((b, k) => k > 0 && toSegment(p, line[k - 1] as Pt, b).d <= LINE + 0.05);

/** Points every quarter pixel along a polyline. */
const samples = (line: readonly Pt[]): Pt[] =>
  line.slice(1).flatMap((b, k) => {
    const a = line[k] as Pt;
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 4);
    return Array.from({ length: n }, (_, i): Pt => [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
  });

/** Whether two polylines run on top of each other along a piece: lines of one trunk. */
const share = (a: readonly Pt[], b: readonly Pt[]): boolean => samples(a).filter((p) => near(b, p)).length > 8;

/**
 * Points of earlier lines that a later line of the same trunk cuts with its halo and does not paint again: the nicks
 * beside a junction.
 */
function nicks(svg: string): Pt[] {
  const edges = edgesOf(svg);
  return edges.flatMap((later, k) =>
    edges
      .slice(0, k)
      .filter((e) => share(e.line, later.line))
      .flatMap((e) => samples(e.line).filter((p) => covers(later.halo, p) && !near(later.line, p))),
  );
}

const stress = (kind: string, name: string) => readFileSync(new URL(`stress/${kind}/${name}`, import.meta.url), 'utf8');

describe('halos of lines on a shared trunk', () => {
  it.each([
    ['eight subclasses on one trunk', stress('class', 'vererbung-acht.dgr')],
    ['a trunk of two', classSource('auftragsabwicklung.dgr')],
    ['realisations on a dashed trunk', stress('class', 'schnittstellen.dgr')],
    ['transitions fanned out on a trunk', stress('state', 'ausgaenge-sechs.dgr')],
    ['a state machine with a trunk', stateSource('auftragsabwicklung.dgr')],
  ])('cut no line of their own trunk beside a junction: %s', (_, source) => {
    const svg = compile(source, { plugins: [umlPlugin] }).svg ?? '';
    expect(edgesOf(svg).length).toBeGreaterThan(1);
    expect(nicks(svg)).toEqual([]);
  });
});
