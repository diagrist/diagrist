import { lineFindings, lineMetrics, type Rect } from '@diagrist/core';
import { bottom, right } from '../geometry.js';
import { type GutterRoom, widen } from '../label/gutters.js';
import type { GridLayout, Route } from '../layout.js';
import { fitFrames } from '../place/fit.js';
import type { Leaving } from '../route/channel/inside.js';
import { linesOfLaid } from '../score.js';
import type { GridSpec } from '../spec.js';
import type { CellSigns } from './grid-signs.js';

/** A fixed grid placed, routed and signed, as `layoutCells` runs it. */
export interface Laid {
  readonly spec: GridSpec;
  readonly grid: GridLayout;
  readonly routes: readonly Route[];
  readonly signs: CellSigns;
}

/** How often the gaps widen for frames that grew, as the rounds of `layoutCells`. */
const ROUNDS = 3;

/** The findings of the line check that no crossing saved may buy. */
const HARD = new Set(['through', 'ports', 'label']);

const marked = (spec: GridSpec, edges: ReadonlySet<string>): GridSpec => ({
  ...spec,
  edges: spec.edges.map((e) => (edges.has(e.id) ? ({ ...e, outside: true } as Leaving) : e)),
});

/** The frames of `r` grown around the routes of `edges` between their own nodes and the texts on them. */
export function grown(r: Laid, edges: ReadonlySet<string>): GridLayout {
  const keep = r.routes.flatMap((route, i) => (edges.has(route.edge) ? [i] : []));
  const labels = r.signs.labels.flatMap((l) => {
    const k = keep.indexOf(l.route);
    return k < 0 ? [] : [{ route: k, box: l.box }];
  });
  return fitFrames(
    r.spec,
    r.signs.grid,
    keep.map((i) => r.routes[i] as Route),
    labels,
  );
}

/**
 * The gaps a frame grew into, each as wide as it must be so the frame keeps `framePad.x` from the column or row
 * beyond: the lanes of a gap stay centred, so a gap grows by twice what the frame overreaches.
 */
function room(spec: GridSpec, before: GridLayout, after: GridLayout): GutterRoom | undefined {
  const pad = spec.metrics.framePad.x;
  const up = (n: number) => Math.ceil(n / spec.metrics.grid) * spec.metrics.grid;
  const asks = (spans: readonly (readonly [number, number])[], far: (r: Rect) => number, near: (r: Rect) => number) =>
    spans.slice(1).map(([hi], i) => {
      const lo = (spans[i]?.[0] ?? 0) + (spans[i]?.[1] ?? 0);
      const over = after.groups.map((g, k) => {
        const was = before.groups[k]?.rect ?? g.rect;
        const right = far(g.rect) > far(was) && far(g.rect) > lo && far(was) < hi ? far(g.rect) + pad - hi : 0;
        const left = near(g.rect) < near(was) && near(g.rect) < hi && near(was) > lo ? lo - (near(g.rect) - pad) : 0;
        return Math.max(right, left);
      });
      const most = Math.max(0, ...over);
      return most > 0 ? up(hi - lo + 2 * most) : 0;
    });
  const cols = asks(
    after.cols.map((c) => [c.x, c.w]),
    right,
    (r) => r.x,
  );
  const rows = asks(
    after.rows.map((r) => [r.y, r.h]),
    bottom,
    (r) => r.y,
  );
  return [...cols, ...rows].some((n) => n > 0) ? { cols, rows } : undefined;
}

/**
 * Crossings and breaches of the hard rules of a laid out grid, and what its frames cover: the boxes they meet and the
 * texts their outlines run through.
 */
function judged(r: Laid, grid: GridLayout) {
  const ends = new Map(r.spec.edges.map((e) => [e.id, [e.from, e.to] as const]));
  const input = linesOfLaid({
    nodes: grid.nodes,
    routes: r.routes,
    ends: r.routes.map((x) => ends.get(x.edge) ?? ['', '']),
    labels: r.signs.labels,
    frames: grid.groups.map((g) => ({ id: g.id, rect: g.rect })),
    width: grid.width,
    height: grid.bottom,
  });
  const meets = (a: Rect, b: Rect) => a.x < right(b) && b.x < right(a) && a.y < bottom(b) && b.y < bottom(a);
  const within = (a: Rect, b: Rect) => a.x >= b.x && right(a) <= right(b) && a.y >= b.y && bottom(a) <= bottom(b);
  const astride = (a: Rect, b: Rect) => meets(a, b) && !within(a, b);
  const covered = grid.groups.reduce(
    (n, g) =>
      n +
      grid.nodes.filter((x) => meets(x.rect, g.rect)).length +
      r.signs.labels.filter((l) => astride(l.box, g.rect)).length,
    0,
  );
  const hard = lineFindings(input, { crossingsUpTo: 0 }).filter((f) => HARD.has(f.rule)).length;
  return { crossings: lineMetrics(input).crossings, hard, covered };
}

/**
 * A Z that `keepInside` moved into the crowded gap inside a frame tried in its own gap outside it instead (ADR 0038,
 * amendment of 06.11.2026): the frame grows around the line and its text, and the gap beyond the frame widens until
 * the frame keeps clear of the next column, at most `ROUNDS` times; the texts are sought again in the grown frames.
 * The grid stays so only where it crosses fewer
 * lines, breaks no hard rule more often and its frames cover no more boxes; a fixed grid only, since an adaptive one
 * grows its frames anyway.
 */
export function outsideRound(
  done: Laid,
  run: (spec: GridSpec) => Laid,
  sign: (spec: GridSpec, grid: GridLayout, routes: readonly Route[]) => CellSigns,
): Laid {
  if (done.spec.adaptive || done.spec.groups.length === 0) return done;
  const free = run(marked(done.spec, new Set(done.spec.edges.map((e) => e.id))));
  const was = new Map(done.routes.map((r) => [r.edge, JSON.stringify(r.points)]));
  const moved = new Set(free.routes.filter((r) => was.get(r.edge) !== JSON.stringify(r.points)).map((r) => r.edge));
  if (moved.size === 0) return done;
  let spec = marked(done.spec, moved);
  for (let round = 0; round < ROUNDS; round++) {
    const first = run(spec);
    const signs = sign(spec, grown(first, moved), first.routes);
    const tried = { ...first, signs };
    const grid = grown(tried, moved);
    const wider = room(spec, first.grid, grid);
    if (wider) {
      spec = widen(spec, wider);
      continue;
    }
    const [a, b] = [judged(done, done.signs.grid), judged(tried, grid)];
    const better = b.crossings < a.crossings && b.hard <= a.hard && b.covered <= a.covered;
    return better ? { ...tried, signs: { ...tried.signs, grid } } : done;
  }
  return done;
}
