import {
  COLORS as c,
  DASH,
  type Font,
  type Marker,
  type MarkerShape,
  type RoleStyle,
  rule,
  STANDARD_FONTS,
  type StyleRule,
  TONE_NAMES,
  TONES,
  textRule,
  STROKES as w,
} from '@diagrist/core';
import { PART_ROLES } from '@diagrist/parts';

/** Font roles of the UML kinds with boxes, class and state machine diagrams: layout measures with them. */
export const UML_BOX_FONTS = {
  ...STANDARD_FONTS,
  stereo: STANDARD_FONTS.note,
  member: { size: 11 },
} as const satisfies Record<string, Font>;

const F = UML_BOX_FONTS;

/** Tinted areas of the card look: opacity of fill and outline. */
const TINT = { fill: 0.07, stroke: 0.45 } as const;

const one = (...classes: string[]): RoleStyle => ({ classes });

/**
 * Rules the UML kinds with boxes share: notes, the card look, member texts, end symbols. The end symbols paint
 * markers, which the kernel does not count as used, so they are always written (docs/burn-down.md).
 */
export const UML_BOX_RULES: readonly StyleRule[] = [
  rule('card', `fill: ${c.fill}; stroke: ${c.grid}; stroke-width: ${w.frame};`),
  rule('card-shadow', `fill: ${c.grid}; stroke: none;`),
  rule('note-box', `fill: ${c.canvas}; stroke: ${c.note}; stroke-width: ${w.frame}; stroke-dasharray: ${DASH.frame};`),
  rule('note-tail', `fill: none; stroke: ${c.note}; stroke-width: ${w.frame}; stroke-dasharray: ${DASH.frame};`),
  rule('entity-rule', `stroke: ${c.grid}; stroke-width: ${w.frame};`),
  ...TONE_NAMES.map((tone) => rule(`tone-${tone}`, `fill: ${TONES[tone]};`)),
  rule('uml-stereo', textRule(`fill: ${c.stroke};`, F.stereo)),
  rule('uml-member', textRule(`fill: ${c.stroke};`, F.member)),
  rule('uml-italic', 'font-style: italic;'),
  rule('uml-rule', `stroke: ${c.stroke}; stroke-width: ${w.frame};`),
  rule('uml-emph', `fill: ${c.fill}; stroke: ${c.accent}; stroke-width: ${w.emph};`),
  rule('uml-hollow', `fill: ${c.canvas}; stroke: ${c.stroke}; stroke-width: ${w.line}; stroke-linejoin: miter;`, true),
  rule('uml-filled', `fill: ${c.stroke}; stroke: ${c.stroke}; stroke-width: ${w.line}; stroke-linejoin: miter;`, true),
  rule('uml-hollow-accent', `fill: ${c.canvas}; stroke: ${c.accent}; stroke-width: ${w.accent};`, true),
  rule('uml-filled-accent', `fill: ${c.accent}; stroke: ${c.accent}; stroke-width: ${w.accent};`, true),
  rule('uml-stub', `fill: none; stroke: ${c.stroke}; stroke-opacity: 0;`),
  rule('uml-package', `fill: none; stroke: ${c.stroke}; stroke-width: ${w.shape};`),
  rule('uml-tether', `fill: none; stroke: ${c.stroke}; stroke-width: ${w.line}; stroke-dasharray: ${DASH.line};`),
  rule('card-head-text', textRule('fill: #ffffff;', F.name)),
  rule('card-head-sub', textRule('fill: #ffffff; fill-opacity: 0.85;', F.note)),
  rule('card-box', `fill: ${c.fill}; stroke: ${c.border}; stroke-width: ${w.frame};`),
  ...TONE_NAMES.map((tone) =>
    rule(
      `tint-${tone}`,
      `fill: ${TONES[tone]}; fill-opacity: ${TINT.fill}; stroke: ${TONES[tone]}; stroke-opacity: ${TINT.stroke}; stroke-width: ${w.frame};`,
    ),
  ),
];

/** Edge length of the markers of UML relations: room for the predecessor's diamond of 16 pixels. */
export const MARKER_SIZE = 18;

/** An outline given in pixels of a marker of `MARKER_SIZE`, as points of the kernel's 12-unit grid; the tip at (16.5, 9). */
const outline = (points: readonly (readonly [number, number])[], closed: boolean): MarkerShape => ({
  points: points.map(([x, y]) => [(x * 12) / MARKER_SIZE, (y * 12) / MARKER_SIZE] as const),
  closed,
});

/**
 * End symbols of the sizes the predecessor drew after the learning platform: triangle 14 by 14, diamond 16 by 10,
 * open head 10 by 10.
 */
const SHAPES = {
  arrow: outline(
    [
      [6.5, 4],
      [16.5, 9],
      [6.5, 14],
    ],
    false,
  ),
  triangle: outline(
    [
      [2.5, 2],
      [16.5, 9],
      [2.5, 16],
    ],
    true,
  ),
  diamond: outline(
    [
      [0.5, 9],
      [8.5, 4],
      [16.5, 9],
      [8.5, 14],
    ],
    true,
  ),
} as const;

/**
 * The end symbols of UML relations as the kernel's markers, always at the end of a path. A symbol at the start of a
 * relation, such as the diamond at the whole, sits at the end of a stub: the first piece of the line drawn backwards
 * with a transparent stroke, since the PNG renderer neither turns markers with `auto-start-reverse` nor draws them
 * on paths without a stroke.
 */
export const UML_MARKERS: readonly Marker[] = [
  { id: 'uml-open', shape: SHAPES.arrow, name: 'arrow-open' },
  { id: 'uml-open-accent', shape: SHAPES.arrow, name: 'arrow-open-accent' },
  { id: 'hollow', shape: SHAPES.triangle, name: 'uml-hollow' },
  { id: 'hollow-accent', shape: SHAPES.triangle, name: 'uml-hollow-accent' },
  { id: 'diamond', shape: SHAPES.diamond, name: 'uml-hollow' },
  { id: 'diamond-accent', shape: SHAPES.diamond, name: 'uml-hollow-accent' },
  { id: 'diamond-filled', shape: SHAPES.diamond, name: 'uml-filled' },
  { id: 'diamond-filled-accent', shape: SHAPES.diamond, name: 'uml-filled-accent' },
];

/** Roles the UML kinds with boxes share, in both looks. */
export const UML_BOX_ROLES: Readonly<Record<string, RoleStyle>> = {
  ...PART_ROLES,
  box: one('shape'),
  boxEmph: one('uml-emph'),
  name: one('label-bold'),
  nameItalic: one('label-bold', 'uml-italic'),
  stereo: one('uml-stereo'),
  member: one('uml-member'),
  memberItalic: one('uml-member', 'uml-italic'),
  divider: one('line'),
  underline: one('uml-rule'),
  halo: one('line', 'halo'),
  label: one('label', 'halo'),
  labelEmph: one('label-accent', 'halo'),
  plainLabel: one('label'),
  noteBox: one('note-box'),
  noteTail: one('note-tail'),
  noteText: one('label-note'),
  card: one('card'),
  cardShadow: one('card-shadow'),
  cardBox: one('card-box'),
  cardName: one('card-head-text'),
  cardNameItalic: one('card-head-text', 'uml-italic'),
  cardStereo: one('card-head-sub'),
  cardRule: one('entity-rule'),
  ...Object.fromEntries(
    TONE_NAMES.flatMap((tone) => [`tone-${tone}`, `tint-${tone}`].map((name) => [name, one(name)])),
  ),
};
