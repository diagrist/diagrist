import {
  fitFrames,
  type GridLayout,
  type GridSpec,
  placeGrid,
  type Route,
  routeEdges,
  type Slot,
} from '@diagrist/layout-grid';
import type { UseCaseModel } from '../model.js';
import { type Annotations, annotate } from './annotate.js';
import type { Comment } from './art.js';
import { useCaseGrid } from './auto/index.js';
import { useCaseSpec } from './spec.js';

/** At most this many free rows one after the other; each costs a full layout per candidate. */
const ROUNDS = 4;

/** One laid out attempt: spec, placed and fitted grid, routes, labels, comments, and its weighed conflicts. */
export interface Trial extends Annotations {
  readonly spec: GridSpec;
  readonly layout: GridLayout;
  readonly routes: readonly Route[];
  readonly cost: number;
  readonly slots: readonly Slot[];
}

function run(m: UseCaseModel, slots: readonly Slot[]): Trial {
  const spec = useCaseSpec(m, useCaseGrid(m, slots));
  const placed = placeGrid(spec);
  const routes = routeEdges(spec, placed);
  const notes = annotate(m, spec, placed, routes);
  const layout = fitFrames(spec, placed, routes, notes.labels);
  const cost = notes.comments.reduce((s, c) => s + c.conflicts, 0);
  return { spec, layout, routes, ...notes, cost, slots };
}

/** Top and bottom use case of a subject: rows above and below them lie outside its frame. */
function rim(subject: string, m: UseCaseModel, t: Trial): Slot[] {
  const inside = t.layout.nodes
    .filter((n) => m.cases.get(n.id)?.subject === subject)
    .sort((a, b) => a.rect.y - b.rect.y);
  const top = inside[0];
  const last = inside.at(-1);
  return top && last
    ? [
        { near: top.id, below: false },
        { near: last.id, below: true, rows: 2 },
      ]
    : [];
}

/** Where room for a note can arise: below or above its element, for an extend at both ends of the line. */
function candidates(c: Comment, m: UseCaseModel, t: Trial): Slot[] {
  if (c.on !== undefined && m.subjects.has(c.on)) return rim(c.on, m, t);
  const route = c.route === undefined ? undefined : t.routes[c.route];
  const edge = route && t.spec.edges.find((e) => e.id === route.edge);
  const near = c.on !== undefined ? [c.on] : edge ? [edge.to, edge.from] : [];
  return near.flatMap((id) => [
    { near: id, below: true },
    { near: id, below: false },
  ]);
}

/**
 * Layout of a use case diagram with the automatic grid. When a note (an extend condition or `note on`) finds no free
 * spot, the grid tries keeping a row free beside its element; the attempt with the fewest conflicts stays. Without
 * conflicts the grid stays as it is.
 */
export function fitUseCase(m: UseCaseModel): Trial {
  let best = run(m, []);
  for (let round = 0; round < ROUNDS && best.cost > 0; round++) {
    let next = best;
    for (const c of best.comments) {
      if (!c.conflicts) continue;
      for (const s of candidates(c, m, best)) {
        if (best.slots.some((x) => x.near === s.near && x.below === s.below)) continue;
        const trial = run(m, [...best.slots, s]);
        if (trial.cost < next.cost) next = trial;
      }
    }
    if (next === best) break;
    best = next;
  }
  return best;
}
