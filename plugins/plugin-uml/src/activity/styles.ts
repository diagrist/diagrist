import {
  COLORS as c,
  DASH,
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
import { ACT_FONTS as F } from './layout/metrics.js';

/** Rules of activity diagrams, as the predecessor wrote them; the kernel writes only those a shape uses. */
const RULES: readonly StyleRule[] = [
  rule('card', `fill: ${c.fill}; stroke: ${c.grid}; stroke-width: ${w.frame};`),
  rule('card-shadow', `fill: ${c.grid}; stroke: none;`),
  ...TONE_NAMES.map((tone) => rule(`tone-${tone}`, `fill: ${TONES[tone]};`)),
  rule('uml-filled', `fill: ${c.stroke}; stroke: ${c.stroke}; stroke-width: ${w.line}; stroke-linejoin: miter;`),
  rule('act-text', textRule(`fill: ${c.stroke};`, F.act)),
  rule('act-lane', `fill: none; stroke: ${c.stroke}; stroke-width: ${w.frame};`),
  rule('act-lane-head', `fill: ${c.fillMuted}; stroke: ${c.stroke}; stroke-width: ${w.frame};`),
  rule('act-region', `fill: none; stroke: ${c.stroke}; stroke-width: ${w.frame}; stroke-dasharray: ${DASH.line};`),
  rule('card-head-text', textRule('fill: #ffffff;', F.name)),
  rule('card-lane', `fill: none; stroke: ${c.grid}; stroke-width: ${w.frame};`),
  ...TONE_NAMES.map((tone) =>
    rule(
      `outline-${tone}`,
      `fill: ${c.fill}; stroke: ${TONES[tone]}; stroke-width: ${w.shape}; stroke-linecap: round; stroke-linejoin: round;`,
    ),
  ),
];

const one = (...classes: string[]): RoleStyle => ({ classes });

/** Classes by tone for the card look: filled lane head, outlined card. */
const TONED = Object.fromEntries(
  TONE_NAMES.flatMap((tone) => [`tone-${tone}`, `outline-${tone}`].map((name) => [name, one(name)])),
);

const ROLES: Record<string, RoleStyle> = {
  ...PART_ROLES,
  shape: one('shape'),
  filled: one('uml-filled'),
  line: one('line'),
  flow: { classes: ['line'], marker: 'open' },
  text: one('act-text'),
  label: one('label'),
  guard: one('label', 'halo'),
  lane: one('act-lane'),
  laneHead: one('act-lane-head'),
  laneName: one('label-bold'),
  cardLane: one('card-lane'),
  cardHead: one('card-head-text'),
  region: one('act-region'),
  card: one('card'),
  cardShadow: one('card-shadow'),
  ...TONED,
};

/** The style table of activity diagrams: the kernel's standard look and the activity rules. */
export const ACTIVITY_STYLES: Styles = standardStyles({ roles: ROLES, rules: RULES, fonts: F });
