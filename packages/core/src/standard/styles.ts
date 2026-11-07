import type { Marker, RoleStyle, StyleRule, Styles } from '../styles.js';
import { MARKER_SHAPES } from '../styles.js';
import { FONT_STACKS, type Font } from '../text.js';
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

/** A rule for a class, written into a picture when one of its shapes, texts or markers uses the class. */
export const rule = (name: string, declarations: string): StyleRule => ({ name, declarations });

/**
 * Declarations of a text class: its paint, then family, weight, size and letter spacing of its font. A font
 * without `family` leaves the family to the root, as the standard look does.
 */
export const textRule = (paint: string, font: Font): string =>
  `${paint} ${font.family === undefined ? '' : `font-family: ${FONT_STACKS[font.family]}; `}${font.weight === undefined ? '' : `font-weight: ${font.weight}; `}font-size: ${font.size}px;${font.letterSpacing === undefined ? '' : ` letter-spacing: ${font.letterSpacing}px;`}`;

const F = STANDARD_FONTS;

/** The rules every kind of the standard look shares; a picture carries those it uses. */
const BASE_RULES: readonly StyleRule[] = [
  rule('shape', `fill: ${c.fill}; stroke: ${c.stroke}; stroke-width: ${w.shape};`),
  rule('shape-muted', `fill: ${c.fillMuted}; stroke: ${c.stroke}; stroke-width: ${w.shape};`),
  rule('shape-emph', `fill: ${c.fill}; stroke: ${c.stroke}; stroke-width: ${w.emph};`),
  rule('frame', `fill: none; stroke: ${c.border}; stroke-width: ${w.frame}; stroke-dasharray: ${DASH.frame};`),
  rule('frame-own', `fill: ${c.fillMuted}; fill-opacity: 0.55; stroke: ${c.stroke}; stroke-width: ${w.frameOwn};`),
  rule('line', `fill: none; stroke: ${c.stroke}; stroke-width: ${w.line};`),
  rule('line-accent', `fill: none; stroke: ${c.accent}; stroke-width: ${w.accent};`),
  rule('dashed', `stroke-dasharray: ${DASH.line};`),
  rule('label', textRule(`fill: ${c.stroke};`, F.label)),
  rule('label-accent', textRule(`fill: ${c.accent};`, F.label)),
  rule('label-bold', textRule(`fill: ${c.stroke};`, F.name)),
  rule('label-title', textRule(`fill: ${c.stroke};`, F.title)),
  rule('label-group', textRule(`fill: ${c.stroke};`, F.group)),
  rule('label-note', textRule(`fill: ${c.note};`, F.note)),
  rule('arrow-open', `fill: none; stroke: ${c.stroke}; stroke-width: ${w.line};`),
  rule('arrow-filled', `fill: ${c.stroke}; stroke: none;`),
  rule('arrow-open-accent', `fill: none; stroke: ${c.accent}; stroke-width: ${w.accent};`),
  rule('arrow-filled-accent', `fill: ${c.accent}; stroke: none;`),
  rule('halo', `paint-order: stroke; stroke: ${c.canvas}; stroke-width: ${w.halo}px; stroke-linejoin: round;`),
  rule('badge', `fill: ${c.stroke};`),
  rule('badge-accent', `fill: ${c.accent};`),
  rule('badge-text', textRule('fill: #ffffff;', F.badge)),
  rule('mark', `fill: ${c.accentSoft}; stroke: ${c.accent}; stroke-width: ${w.frame};`),
  rule('mark-text', textRule(`fill: ${c.accent};`, F.mark)),
];

/** Arrowheads, open and filled, in ink and in the accent; a picture carries those its lines end in. */
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
 * rules every kind shares, then the kind's own (ADR 0010). `compile({ theme })` lays a theme over the result,
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
