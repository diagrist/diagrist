import type { Shape } from '@diagrist/core';
import { type LegendEntry, markShapes } from '@diagrist/parts';
import { type Sample, SHAPE_SAMPLE, type SwatchRole } from '../layout/legend.js';
import { badgeShapes, bodyShapes, clockShapes, replicaShapes } from './bodies.js';
import { changeTagShapes } from './diff.js';

const SWATCH = { w: 40, h: 14, rx: 4 } as const;
const SWATCH_ROLE: Readonly<Record<SwatchRole, string>> = {
  own: 'frameOwn',
  shared: 'boxMuted',
  external: 'frame',
  emph: 'boxEmph',
  planned: 'boxPlanned',
  deprecated: 'boxDeprecated',
};

/** The sample of a legend entry at its place: line, swatch, shape, replica tag, flow number or mark. */
export function sampleShapes(entry: LegendEntry<Sample>): readonly Shape[] {
  const { sample, at } = entry;
  const { x, y } = at;
  switch (sample.kind) {
    case 'edge':
      return [{ kind: 'path', d: `M${x} ${y} H${x + SWATCH.w}`, role: `edge-${sample.edge}` }];
    case 'swatch':
      return [
        {
          kind: 'rect',
          x,
          y: y - SWATCH.h / 2,
          w: SWATCH.w,
          h: SWATCH.h,
          rx: SWATCH.rx,
          role: SWATCH_ROLE[sample.role],
        },
      ];
    case 'shape': {
      const rect = { x, y: y - SHAPE_SAMPLE.h / 2, w: SHAPE_SAMPLE.w, h: SHAPE_SAMPLE.h };
      const clock = sample.shape === 'job' ? clockShapes({ x: x + rect.w / 2, y }, 'detail') : [];
      return [...bodyShapes(sample.shape, rect, 'box', 'detail'), ...clock];
    }
    case 'replicas':
      return replicaShapes('x3', at);
    case 'badge':
      return badgeShapes(sample.n, x, y, sample.accent);
    case 'mark':
      return markShapes('E1', x, y);
    case 'change': {
      const role = sample.change === 'added' ? 'boxAdded' : sample.change === 'removed' ? 'boxRemoved' : 'box';
      const box = { kind: 'rect', x, y: y - SWATCH.h / 2, w: SWATCH.w, h: SWATCH.h, rx: SWATCH.rx, role } as const;
      return [box, ...changeTagShapes(sample.change, x + SWATCH.w / 2, y)];
    }
    case 'none':
      return [];
  }
}
