import type { Point } from '@diagrist/core';
import { markAt } from '../label/spots.js';
import type { GridLayout, Route } from '../layout.js';
import { placedOf } from '../placed.js';
import type { GridSpec } from '../spec.js';
import type { GridWay } from '../way.js';
import type { CellGraph, CellLayout } from './cells.js';
import { better } from './grid-judge.js';
import type { CellSigns } from './grid-signs.js';

/** A fixed grid placed, routed and signed once. */
export interface Round {
  readonly spec: GridSpec;
  readonly grid: GridLayout;
  readonly routes: readonly Route[];
  readonly signs: CellSigns;
}

type Cells = CellGraph['given']['cells'];

/** What a round hands the kind: the grid with its routes, texts, signs and everything placed for the check. */
export function cellLayout(cells: Cells, done: Round): CellLayout {
  const { spec, routes, signs } = done;
  const numbers = cells.signs?.numbers ?? { w: 0, h: 0 };
  const pins = cells.signs?.pins ?? { w: 0, h: 0 };
  const rect = (at: Point, size: { readonly w: number; readonly h: number }) => markAt(at, size.w, size.h);
  return {
    grid: signs.grid,
    routes,
    labels: signs.labels,
    numbers: signs.numbers,
    pins: signs.pins,
    corners: (cells.signs?.corners?.at ?? []).flatMap(({ node }, i) => {
      const at = signs.corners[i];
      return at ? [{ node, x: at[0], y: at[1] }] : [];
    }),
    placed: placedOf(spec, signs.grid, routes, signs.labels, [
      ...signs.numbers.map((n) => ({ route: n.route, rect: rect([n.x, n.y], numbers) })),
      ...signs.pins.map((p) => ({ route: p.route, rect: rect([p.x, p.y], pins), name: 'mark' })),
    ]),
  };
}

/** The ways the pricing chose in a round (`Route.way`), by edge. */
export const chosenWays = (round: Round): Map<string, GridWay> =>
  new Map(round.routes.flatMap((r) => (r.way ? [[r.edge, r.way] as const] : [])));

/**
 * The ways the rounds of the pricing chose, by edge, where it then took shorter ones (`Route.earlier`); none where
 * it took none.
 */
export function roundWays(round: Round): Map<string, GridWay> | undefined {
  if (!round.routes.some((r) => r.earlier)) return undefined;
  return new Map(
    round.routes.flatMap((r) => {
      const way = r.earlier ? r.earlier.way : r.way;
      return way ? [[r.edge, way] as const] : [];
    }),
  );
}

/** The spec with each edge of `ways` keeping its way (`GridEdge.way`), so the runs after need not price again. */
export function withWays(spec: GridSpec, ways: ReadonlyMap<string, GridWay>): GridSpec {
  return {
    ...spec,
    edges: spec.edges.map((e) => {
      const way = ways.get(e.id);
      return way ? { ...e, way } : e;
    }),
  };
}

/**
 * The price of the round, one way at a time (ADR 0039, owner decision D2 of 07.11.2026): the routes are priced
 * before their texts, so each way the pricing chose (`ways`) is judged with the texts, in the order of the edges, and
 * stays where the round with it and the ways kept so far is better (`better`), each round with its frames grown as
 * `framed` grows them. The round of the ways that stay, `plain` where none does.
 */
export function oneByOne(
  cells: Cells,
  plain: Round,
  ways: ReadonlyMap<string, GridWay>,
  run: (spec: GridSpec) => Round,
  framed: (round: Round) => Round,
): Round {
  const judged = (a: Round, b: Round) => better(plain.spec, cellLayout(cells, framed(a)), cellLayout(cells, framed(b)));
  let done = plain;
  let kept = new Map<string, GridWay>();
  for (const [edge, way] of ways) {
    const next = new Map(kept).set(edge, way);
    const tried = run(withWays(plain.spec, next));
    if (!judged(done, tried)) continue;
    [done, kept] = [tried, next];
  }
  return done;
}
