import { domId, type Shape } from '@diagrist/core';
import type { EdgeLabel, Route } from '@diagrist/layout-grid';
import { markShapes } from '@diagrist/parts';
import type { ArchitectureLayout } from '../../layout/index.js';
import type { LookOptions } from '../../looks/look.js';
import type { ArchitectureModel } from '../../model/types.js';
import { badgeShapes } from '../bodies.js';
import type { Surface } from '../surfaces.js';
import { discShapes } from './disc.js';
import { gapShapes } from './gap.js';
import { haloShapes } from './halo.js';

/** How each value of `numbers.form` draws a flow number. */
const NUMBERS: Readonly<
  Record<LookOptions['numbers']['form'], (n: number, x: number, y: number, accent: boolean) => Shape[]>
> = {
  plate: badgeShapes,
  disc: discShapes,
};

/** Routes that have a label, a flow number or a mark, in route order; each gets its group `label-<i>`. */
export function labelledRoutes(layout: ArchitectureLayout): number[] {
  const all = [
    ...layout.labels.map((l) => l.route),
    ...layout.badges.map((b) => b.route),
    ...layout.marks.flatMap((m) => (m.route === undefined ? [] : [m.route])),
  ];
  return [...new Set(all)].sort((a, b) => a - b);
}

/**
 * Per labelled route a group with its texts on the ground of `edgeText.ground`, its flow number in the form of
 * `numbers.form` and its marks; after them the marks at nodes.
 */
export function labelShapes(
  model: ArchitectureModel,
  routes: readonly Route[],
  layout: ArchitectureLayout,
  under: readonly Surface[],
): Shape[] {
  const { options } = layout.look;
  const accent = (route: number) => model.edges[Number(routes[route]?.edge)]?.step?.accent === true;
  const badge = NUMBERS[options.numbers.form];
  const texts = (i: number, own: readonly EdgeLabel[]) =>
    options.edgeText.ground === 'gap' ? gapShapes(own, under) : own.flatMap((l) => haloShapes(l, accent(i), under));
  const groups = labelledRoutes(layout).map(
    (i): Shape => ({
      kind: 'group',
      id: domId.label(i),
      children: [
        ...texts(
          i,
          layout.labels.filter((l) => l.route === i),
        ),
        ...layout.badges.filter((b) => b.route === i).flatMap((b) => badge(b.n, b.x, b.y, b.accent)),
        ...layout.marks.filter((m) => m.route === i).flatMap((m) => markShapes(m.id, m.x, m.y)),
      ],
    }),
  );
  const nodeMarks = layout.marks.filter((m) => m.route === undefined).flatMap((m) => markShapes(m.id, m.x, m.y));
  return [...groups, ...nodeMarks];
}
