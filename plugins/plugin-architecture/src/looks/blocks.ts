import { rule, type StyleRule, textRule } from '@diagrist/core';
import { type FontSizes, STANDARD, standardFonts } from '../layout/metrics.js';
import { STANDARD_STROKES, type Strokes, standardChanges } from '../styles/rules.js';
import type { Look, LookFonts } from './look.js';

const SIZES: FontSizes = { title: 16, node: 19, group: 16, label: 14, note: 14, badge: 12 };

/**
 * The base rules blocks draw larger and thicker: the same rules as the standard look, with the measures of blocks
 * (ADR 0010: measures that change geometry make a variant, not a theme). They replace the standard ones in place.
 */
function blockBase(fonts: LookFonts, w: Strokes): StyleRule[] {
  const f = {
    label: fonts.label.size,
    node: fonts.name.size,
    title: fonts.title.size,
    group: fonts.group.size,
    note: fonts.note.size,
    badge: fonts.badge.size,
  };
  const ink = 'fill: #18181b;';
  const accent = 'fill: #1d4ed8;';
  return [
    rule('shape-emph', `fill: #ffffff; stroke: #18181b; stroke-width: ${w.emph};`, true),
    rule('line', `fill: none; stroke: #18181b; stroke-width: ${w.line};`, true),
    rule('line-accent', `fill: none; stroke: #1d4ed8; stroke-width: ${w.accent};`, true),
    rule('label', textRule(ink, { size: f.label }), true),
    rule('label-accent', textRule(accent, { size: f.label }), true),
    rule('label-bold', textRule(ink, { size: f.node, weight: 600 }), true),
    rule('label-title', textRule(ink, { size: f.title, weight: 600 }), true),
    rule('label-group', textRule(ink, { size: f.group, weight: 600 }), true),
    rule('label-note', textRule('fill: #52525b;', { size: f.note }), true),
    rule('arrow-open', `fill: none; stroke: #18181b; stroke-width: ${w.line};`, true),
    rule('arrow-open-accent', `fill: none; stroke: #1d4ed8; stroke-width: ${w.accent};`, true),
    rule('badge-text', textRule('fill: #ffffff;', { size: f.badge, weight: 700 }), true),
    rule('mark-text', textRule(accent, { size: f.badge - 1, weight: 700 }), true),
  ];
}

/**
 * Filled blocks with shadows and large text, as pattern books draw them: tubes for queues, cylinders for stores,
 * opaque panels with their title in the middle, thick lines. Sub-modules pack tightly into higher boxes.
 */
export const BLOCKS: Look = {
  doc: 'filled blocks as in pattern books',
  metrics: { ...STANDARD, subColGap: 24, nodeH: 64, nodeLineH: 20, labelDy: 7, laneGap: 36, markerSize: 18 },
  fonts: standardFonts(SIZES),
  paint: {
    strokes: { ...STANDARD_STROKES, line: 3, accent: 3, emph: 3 },
    roles: {},
    rules: blockBase,
    changes: standardChanges,
    root: 'group',
  },
  options: {
    header: 'inline',
    nodes: 'block',
    nodeName: 'inside',
    person: 'figure',
    status: 'word',
    replicas: 'tag',
    groups: { form: 'panel', head: 'centre' },
    edgeText: { place: 'beside', flat: false, ground: 'halo' },
    numbers: { seat: 'free', form: 'plate' },
    marks: 'aside',
    focus: 'accent',
    layers: 'boxes',
    legend: 'none',
    decisions: 'bar',
  },
};
