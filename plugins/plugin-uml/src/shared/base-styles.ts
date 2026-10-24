import { type Font, MARKER_SHAPES, type Marker, type StyleRule } from '@diagrist/core';
import { COLORS as c, DASH, FONT_SIZE as f, STROKES as w } from '../theme.js';

/** Fonts by role: layout measures with them, the stylesheet sets them (ADR 0008). */
export const FONTS = {
  title: { size: f.title, weight: 600 },
  name: { size: f.node, weight: 600 },
  group: { size: f.group, weight: 600 },
  label: { size: f.label },
  note: { size: f.note },
  badge: { size: f.badge, weight: 700 },
  mark: { size: f.badge - 1, weight: 700 },
} as const satisfies Record<string, Font>;

/** A rule for a class; `always` rules are written even when no shape uses them. */
export const rule = (name: string, declarations: string, always = false): StyleRule =>
  always ? { name, declarations, always } : { name, declarations };

/** Declarations of a text class: its paint, then weight and size of its font. */
export const text = (paint: string, font: Font): string =>
  `${paint} ${font.weight === undefined ? '' : `font-weight: ${font.weight}; `}font-size: ${font.size}px;`;

/**
 * The block every picture of the predecessor carried, used or not. Kept for byte-identical output until the
 * clean-up with a second baseline (ADR 0008 Nr. 5), which writes only used rules.
 */
export const BASE_RULES: readonly StyleRule[] = [
  rule('shape', `fill: ${c.fill}; stroke: ${c.stroke}; stroke-width: ${w.shape};`, true),
  rule('shape-muted', `fill: ${c.fillMuted}; stroke: ${c.stroke}; stroke-width: ${w.shape};`, true),
  rule('shape-emph', `fill: ${c.fill}; stroke: ${c.stroke}; stroke-width: ${w.emph};`, true),
  rule('frame', `fill: none; stroke: ${c.border}; stroke-width: ${w.frame}; stroke-dasharray: ${DASH.frame};`, true),
  rule(
    'frame-own',
    `fill: ${c.fillMuted}; fill-opacity: 0.55; stroke: ${c.stroke}; stroke-width: ${w.frameOwn};`,
    true,
  ),
  rule('line', `fill: none; stroke: ${c.stroke}; stroke-width: ${w.line};`, true),
  rule('line-accent', `fill: none; stroke: ${c.accent}; stroke-width: ${w.accent};`, true),
  rule('dashed', `stroke-dasharray: ${DASH.line};`, true),
  rule('label', text(`fill: ${c.stroke};`, FONTS.label), true),
  rule('label-accent', text(`fill: ${c.accent};`, FONTS.label), true),
  rule('label-bold', text(`fill: ${c.stroke};`, FONTS.name), true),
  rule('label-title', text(`fill: ${c.stroke};`, FONTS.title), true),
  rule('label-group', text(`fill: ${c.stroke};`, FONTS.group), true),
  rule('label-note', text(`fill: ${c.note};`, FONTS.note), true),
  rule('arrow-open', `fill: none; stroke: ${c.stroke}; stroke-width: ${w.line};`, true),
  rule('arrow-filled', `fill: ${c.stroke}; stroke: none;`, true),
  rule('arrow-open-accent', `fill: none; stroke: ${c.accent}; stroke-width: ${w.accent};`, true),
  rule('arrow-filled-accent', `fill: ${c.accent}; stroke: none;`, true),
  rule('halo', `paint-order: stroke; stroke: ${c.canvas}; stroke-width: ${w.halo}px; stroke-linejoin: round;`, true),
  rule('badge', `fill: ${c.stroke};`, true),
  rule('badge-accent', `fill: ${c.accent};`, true),
  rule('badge-text', text('fill: #ffffff;', FONTS.badge), true),
  rule('mark', `fill: ${c.accentSoft}; stroke: ${c.accent}; stroke-width: ${w.frame};`, true),
  rule('mark-text', text(`fill: ${c.accent};`, FONTS.mark), true),
];

/** Arrowheads; every picture carries all four (clean-up: only used ones, ADR 0008 Nr. 5). */
export const MARKERS: readonly Marker[] = [
  { id: 'open', shape: MARKER_SHAPES.hook, name: 'arrow-open' },
  { id: 'filled', shape: MARKER_SHAPES.triangle, name: 'arrow-filled' },
  { id: 'open-accent', shape: MARKER_SHAPES.hook, name: 'arrow-open-accent' },
  { id: 'filled-accent', shape: MARKER_SHAPES.triangle, name: 'arrow-filled-accent' },
];
