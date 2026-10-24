import type { Marker, RoleStyle, StyleRule, Styles } from '../styles.js';
import { MARKER_SHAPES } from '../styles.js';
import type { Font } from '../text.js';
import { COLORS as c, DASH, FONT_FAMILY, FONT_SIZE as f, MARKER_SIZE, STROKES as w } from './palette.js';

/** Names of the font roles every kind of the standard look has. */
type StandardFont = 'title' | 'name' | 'group' | 'label' | 'note' | 'badge' | 'mark';

/** Font roles every kind of the standard look has: layout measures with them, the stylesheet sets them. */
export const STANDARD_FONTS: Readonly<Record<StandardFont, Font>> = {
  title: { size: f.title, weight: 600 },
  name: { size: f.node, weight: 600 },
  group: { size: f.group, weight: 600 },
  label: { size: f.label },
  note: { size: f.note },
  badge: { size: f.badge, weight: 700 },
  mark: { size: f.badge - 1, weight: 700 },
};

/** A rule for a class; `always` rules are written even when no shape uses them. */
export const rule = (name: string, declarations: string, always = false): StyleRule =>
  always ? { name, declarations, always } : { name, declarations };

/** Declarations of a text class: its paint, then weight and size of its font. */
export const textRule = (paint: string, font: Font): string =>
  `${paint} ${font.weight === undefined ? '' : `font-weight: ${font.weight}; `}font-size: ${font.size}px;`;

const F = STANDARD_FONTS;

/**
 * The block every picture of the predecessor carried, used or not. Kept for byte-identical output until the
 * clean-up with a second baseline (ADR 0008 Nr. 5), which writes only used rules.
 */
const BASE_RULES: readonly StyleRule[] = [
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
  rule('label', textRule(`fill: ${c.stroke};`, F.label), true),
  rule('label-accent', textRule(`fill: ${c.accent};`, F.label), true),
  rule('label-bold', textRule(`fill: ${c.stroke};`, F.name), true),
  rule('label-title', textRule(`fill: ${c.stroke};`, F.title), true),
  rule('label-group', textRule(`fill: ${c.stroke};`, F.group), true),
  rule('label-note', textRule(`fill: ${c.note};`, F.note), true),
  rule('arrow-open', `fill: none; stroke: ${c.stroke}; stroke-width: ${w.line};`, true),
  rule('arrow-filled', `fill: ${c.stroke}; stroke: none;`, true),
  rule('arrow-open-accent', `fill: none; stroke: ${c.accent}; stroke-width: ${w.accent};`, true),
  rule('arrow-filled-accent', `fill: ${c.accent}; stroke: none;`, true),
  rule('halo', `paint-order: stroke; stroke: ${c.canvas}; stroke-width: ${w.halo}px; stroke-linejoin: round;`, true),
  rule('badge', `fill: ${c.stroke};`, true),
  rule('badge-accent', `fill: ${c.accent};`, true),
  rule('badge-text', textRule('fill: #ffffff;', F.badge), true),
  rule('mark', `fill: ${c.accentSoft}; stroke: ${c.accent}; stroke-width: ${w.frame};`, true),
  rule('mark-text', textRule(`fill: ${c.accent};`, F.mark), true),
];

/** Arrowheads; every picture carries all four (clean-up: only used ones, ADR 0008 Nr. 5). */
const MARKERS: readonly Marker[] = [
  { id: 'open', shape: MARKER_SHAPES.hook, name: 'arrow-open' },
  { id: 'filled', shape: MARKER_SHAPES.triangle, name: 'arrow-filled' },
  { id: 'open-accent', shape: MARKER_SHAPES.hook, name: 'arrow-open-accent' },
  { id: 'filled-accent', shape: MARKER_SHAPES.triangle, name: 'arrow-filled-accent' },
];

/** What a kind adds to the standard look: its roles, its rules after the base block, its own font roles. */
export interface KindStyles {
  readonly roles: Readonly<Record<string, RoleStyle>>;
  readonly rules: readonly StyleRule[];
  /** Font roles besides `STANDARD_FONTS`; one with the same name replaces it. */
  readonly fonts?: Readonly<Record<string, Font>>;
}

/**
 * The style table of a kind in the standard look: root class, font, canvas, the four arrowheads and the base
 * rules every picture carries, then the kind's own (ADR 0010). `compile({ theme })` lays a theme over the result,
 * so a corporate design repaints the base rules and the kind's alike.
 */
export function standardStyles(kind: KindStyles): Styles {
  return {
    root: 'dia',
    fontFamily: FONT_FAMILY,
    fontSize: f.group,
    canvas: c.canvas,
    markerSize: MARKER_SIZE,
    markers: MARKERS,
    roles: kind.roles,
    rules: [...BASE_RULES, ...kind.rules],
    fonts: { ...STANDARD_FONTS, ...kind.fonts },
  };
}
