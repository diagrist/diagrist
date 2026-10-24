import {
  COLORS as c,
  MARKER_SHAPES,
  type RoleStyle,
  rule,
  type StyleRule,
  type Styles,
  standardStyles,
  TONE_NAMES,
  TONES,
  textRule,
  STROKES as w,
} from '@diagrist/core';
import { PART_ROLES } from '@diagrist/parts';
import { CARD_RULES, OUTLINE_RULES, TINT_RULES } from '../shared/card-rules.js';
import { UC_FONTS as F } from './layout/metrics.js';

/**
 * Rules of use case diagrams. The hollow triangles paint markers, which the kernel does not count as used, so they
 * are always written.
 */
const RULES: readonly StyleRule[] = [
  CARD_RULES.noteTail,
  CARD_RULES.shadow,
  ...TONE_NAMES.map((tone) => rule(`tone-${tone}`, `fill: ${TONES[tone]};`)),
  rule('uml-stereo', textRule(`fill: ${c.stroke};`, F.stereo)),
  rule('uml-member', textRule(`fill: ${c.stroke};`, F.member)),
  rule('uml-rule', `stroke: ${c.stroke}; stroke-width: ${w.frame};`),
  rule('uml-emph', `fill: ${c.fill}; stroke: ${c.accent}; stroke-width: ${w.emph};`),
  rule('uml-hollow', `fill: ${c.canvas}; stroke: ${c.stroke}; stroke-width: ${w.line}; stroke-linejoin: miter;`, true),
  rule('uml-hollow-accent', `fill: ${c.canvas}; stroke: ${c.accent}; stroke-width: ${w.accent};`, true),
  rule('uc-name', textRule(`fill: ${c.stroke};`, F.ucName)),
  rule('uc-boundary', `fill: none; stroke: ${c.stroke}; stroke-width: ${w.shape};`),
  rule('uc-note', `fill: ${c.fill}; stroke: ${c.stroke}; stroke-width: ${w.frame};`),
  CARD_RULES.name,
  CARD_RULES.stereo,
  CARD_RULES.box,
  ...TINT_RULES,
  ...OUTLINE_RULES,
];

const one = (...classes: string[]): RoleStyle => ({ classes });

/** Classes by tone for the card look: filled head, tinted area, outlined shape. */
const TONED = Object.fromEntries(
  TONE_NAMES.flatMap((tone) => [`tone-${tone}`, `tint-${tone}`, `outline-${tone}`].map((name) => [name, one(name)])),
);

/** Lines by relation: include and extend dashed with an open head, generalization with a hollow triangle. */
const LINES: Record<string, RoleStyle> = {
  association: one('line'),
  generalization: { classes: ['line'], marker: 'hollow' },
  dependency: { classes: ['line', 'dashed'], marker: 'open' },
  'association-emph': one('line-accent'),
  'generalization-emph': { classes: ['line-accent'], marker: 'hollow-accent' },
  'dependency-emph': { classes: ['line-accent', 'dashed'], marker: 'open-accent' },
};

const ROLES: Record<string, RoleStyle> = {
  ...PART_ROLES,
  subject: one('uc-boundary'),
  subjectName: one('label-bold'),
  outline: one('shape'),
  emph: one('uml-emph'),
  limb: one('line'),
  limbEmph: one('line-accent'),
  name: one('uc-name'),
  boldName: one('label-bold'),
  stereo: one('uml-stereo'),
  member: one('uml-member'),
  rule: one('uml-rule'),
  halo: one('line', 'halo'),
  ...LINES,
  label: one('label', 'halo'),
  labelEmph: one('label-accent', 'halo'),
  note: one('uc-note'),
  noteCard: one('card-box'),
  noteTail: one('note-tail'),
  noteText: one('label'),
  cardShadow: one('card-shadow'),
  cardName: one('card-head-text'),
  cardStereo: one('card-head-sub'),
  ...TONED,
};

/** The style table of use case diagrams: the kernel's standard look, the use case rules, two hollow triangles. */
export const USECASE_STYLES: Styles = (() => {
  const base = standardStyles({ roles: ROLES, rules: RULES, fonts: F });
  return {
    ...base,
    markers: [
      ...base.markers,
      { id: 'hollow', shape: MARKER_SHAPES.triangle, name: 'uml-hollow' },
      { id: 'hollow-accent', shape: MARKER_SHAPES.triangle, name: 'uml-hollow-accent' },
    ],
  };
})();
