import { type FontSizes, STANDARD, standardFonts } from '../layout/metrics.js';
import { STANDARD_STROKES, standardChanges } from '../styles/rules.js';
import type { Look } from './look.js';

const SIZES: FontSizes = { title: 16, node: 19, group: 16, label: 14, note: 14, badge: 12 };

/**
 * Filled blocks with shadows and large text, as pattern books draw them: tubes for queues, cylinders for stores,
 * opaque panels with their title in the middle, thick lines. Sub-modules pack tightly into higher boxes.
 */
export const BLOCKS: Look = {
  doc: 'filled blocks as in pattern books',
  metrics: {
    ...STANDARD,
    subColGap: 24,
    nodeH: 64,
    nodeLineH: 20,
    labelDy: 7,
    labelLineH: 16,
    laneGap: 36,
    markerSize: 18,
  },
  fonts: standardFonts(SIZES),
  paint: {
    strokes: { ...STANDARD_STROKES, line: 3, accent: 3, emph: 3 },
    roles: {},
    rules: () => [],
    changes: standardChanges,
    root: 'group',
  },
  options: {
    header: 'inline',
    nodes: 'block',
    nodeName: 'inside',
    nodeAlign: 'start',
    person: 'figure',
    status: 'word',
    replicas: 'tag',
    groups: { form: 'panel', head: 'centre' },
    edgeText: { place: 'beside', flat: false, ground: 'halo' },
    numbers: { form: 'plate' },
    marks: 'aside',
    focus: 'accent',
    layers: 'boxes',
    legend: 'none',
    decisions: 'bar',
  },
};
