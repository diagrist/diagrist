import { FONT_SIZE, type RoleStyle } from '@diagrist/core';
import { STANDARD, standardFonts } from '../layout/metrics.js';
import { STANDARD_STROKES, standardChanges } from '../styles/rules.js';
import type { Look } from './look.js';

const r = (...classes: string[]): RoleStyle => ({ classes });

/**
 * White cards with a toned icon circle on the top edge, stores as circles, replicas as a stack, frames with their
 * title on the line: dashed for the own system, dotted for external ones. No legend, the icons explain.
 */
export const CARDS: Look = {
  doc: 'toned icon cards',
  metrics: { ...STANDARD, frameRx: 8 },
  fonts: standardFonts(FONT_SIZE),
  paint: {
    strokes: STANDARD_STROKES,
    roles: {
      frameOwn: r('card-frame-dashed'),
      frameShared: r('card-frame'),
      frameExternal: r('card-frame-dotted'),
    },
    rules: () => [],
    changes: standardChanges,
    root: 'group',
  },
  options: {
    header: 'inline',
    nodes: 'card',
    person: 'figure',
    status: 'word',
    groups: { form: 'frame', head: 'onLine' },
    edgeText: { place: 'beside', flat: true, ground: 'halo' },
    numbers: { seat: 'free', form: 'plate' },
    marks: 'aside',
    layers: 'boxes',
    legend: 'none',
    decisions: 'bar',
  },
};
