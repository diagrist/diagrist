import { FONT_SIZE } from '@diagrist/core';
import { STANDARD, standardFonts } from '../layout/metrics.js';
import { STANDARD_STROKES, standardChanges } from '../styles/rules.js';
import type { Look } from './look.js';

/**
 * The standard look, as the predecessor drew it: outlined boxes in JetBrains Mono, frames by role, flow numbers on
 * plates, and below the picture the decision bar and a legend of what the picture uses.
 */
export const PLAIN: Look = {
  doc: 'boxes with a legend',
  metrics: STANDARD,
  fonts: standardFonts(FONT_SIZE),
  paint: { strokes: STANDARD_STROKES, roles: {}, rules: () => [], changes: standardChanges, root: 'group' },
  options: {
    header: 'inline',
    nodes: 'box',
    nodeName: 'inside',
    person: 'figure',
    status: 'word',
    replicas: 'tag',
    groups: { form: 'frame', head: 'corner' },
    edgeText: { place: 'beside', flat: false, ground: 'halo' },
    numbers: { seat: 'free', form: 'plate' },
    marks: 'aside',
    focus: 'accent',
    layers: 'boxes',
    legend: 'strip',
    decisions: 'bar',
  },
};
