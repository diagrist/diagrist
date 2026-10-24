import {
  COLORS as c,
  DASH,
  type Font,
  type RoleStyle,
  rule,
  STANDARD_FONTS,
  type StyleRule,
  type Styles,
  standardStyles,
  TONE_NAMES,
  TONES,
  textRule,
  STROKES as w,
} from '@diagrist/core';
import { PART_ROLES } from '@diagrist/parts';
import { SEQUENCE_TOKENS } from './layout/tokens.js';

/** Fonts by role; `message` is the size every label, guard and constraint is measured with. */
export const FONTS = {
  ...STANDARD_FONTS,
  message: { size: SEQUENCE_TOKENS.messageSize },
  tag: { size: SEQUENCE_TOKENS.messageSize, weight: 700 },
} as const satisfies Record<string, Font>;

const CARDS = { tintFill: 0.07, tintStroke: 0.45 } as const;

/** Classes the predecessor wrote before the sequence rules, in its order: card shapes, tones, ground, stereotype. */
const BEFORE: readonly StyleRule[] = [
  rule('card-shadow', `fill: ${c.grid}; stroke: none;`),
  rule('card-ref', `fill: ${c.fill}; stroke: ${c.border}; stroke-width: ${w.shape}; stroke-dasharray: ${DASH.line};`),
  rule('card-frame', `fill: none; stroke: ${c.border}; stroke-width: ${w.frame};`),
  ...TONE_NAMES.map((tone) => rule(`tone-${tone}`, `fill: ${TONES[tone]};`)),
  rule('label-back', `fill: ${c.canvas}; stroke: none;`),
  rule('uml-stereo', textRule(`fill: ${c.stroke};`, FONTS.note)),
];

const SEQUENCE: readonly StyleRule[] = [
  rule('seq-lifeline', `fill: none; stroke: ${c.note}; stroke-width: ${w.frame}; stroke-dasharray: ${DASH.frame};`),
  rule('seq-activation', `fill: ${c.fill}; stroke: ${c.stroke}; stroke-width: ${w.frame};`),
  rule(
    'seq-external',
    `fill: ${c.fill}; stroke: ${c.stroke}; stroke-width: ${w.shape}; stroke-dasharray: ${DASH.line};`,
  ),
  rule('seq-figure', `fill: ${c.canvas}; stroke: ${c.stroke}; stroke-width: ${w.shape}; stroke-linecap: round;`),
  rule(
    'seq-figure-external',
    `fill: ${c.canvas}; stroke: ${c.stroke}; stroke-width: ${w.shape}; stroke-dasharray: ${DASH.frame};`,
  ),
  rule('seq-frame', `fill: none; stroke: ${c.stroke}; stroke-width: ${w.frame};`),
  rule('seq-tag', `fill: ${c.fillMuted}; stroke: ${c.stroke}; stroke-width: ${w.frame};`),
  rule('seq-tag-text', textRule(`fill: ${c.stroke};`, FONTS.tag)),
  rule('seq-guard', textRule(`fill: ${c.stroke};`, FONTS.message)),
  rule('seq-separator', `fill: none; stroke: ${c.stroke}; stroke-width: ${w.frame}; stroke-dasharray: ${DASH.line};`),
  rule('seq-message', textRule(`fill: ${c.stroke};`, FONTS.message)),
  rule('seq-message-accent', textRule(`fill: ${c.accent};`, FONTS.message)),
  rule('seq-note', `fill: ${c.fill}; stroke: ${c.note}; stroke-width: ${w.frame};`),
  rule('seq-destroy', `fill: none; stroke: ${c.stroke}; stroke-width: ${w.emph};`),
  rule('seq-dot', `fill: ${c.stroke}; stroke: none;`),
];

const AFTER: readonly StyleRule[] = [
  rule('card-head-text', textRule('fill: #ffffff;', FONTS.name)),
  rule('card-head-sub', textRule('fill: #ffffff; fill-opacity: 0.85;', FONTS.note)),
  rule('card-head-edge', `fill: none; stroke: #ffffff; stroke-opacity: 0.6; stroke-width: ${w.frame};`),
  rule('card-tag', `fill: ${c.fillMuted}; stroke: ${c.border}; stroke-width: ${w.frame};`),
  rule('card-box', `fill: ${c.fill}; stroke: ${c.border}; stroke-width: ${w.frame};`),
  ...TONE_NAMES.map((tone) =>
    rule(
      `tint-${tone}`,
      `fill: ${TONES[tone]}; fill-opacity: ${CARDS.tintFill}; stroke: ${TONES[tone]}; stroke-opacity: ${CARDS.tintStroke}; stroke-width: ${w.frame};`,
    ),
  ),
  ...TONE_NAMES.map((tone) =>
    rule(
      `outline-${tone}`,
      `fill: ${c.fill}; stroke: ${TONES[tone]}; stroke-width: ${w.shape}; stroke-linecap: round; stroke-linejoin: round;`,
    ),
  ),
];

const one = (...classes: string[]): RoleStyle => ({ classes });

/** Messages by kind: calls get a filled head, everything else an open one; replies and creations are dashed. */
const MESSAGES: Record<string, RoleStyle> = {
  call: { classes: ['line'], marker: 'filled' },
  signal: { classes: ['line'], marker: 'open' },
  reply: { classes: ['line', 'dashed'], marker: 'open' },
  create: { classes: ['line', 'dashed'], marker: 'open' },
  'call-emph': { classes: ['line-accent'], marker: 'filled-accent' },
  'signal-emph': { classes: ['line-accent'], marker: 'open-accent' },
  'reply-emph': { classes: ['line-accent', 'dashed'], marker: 'open-accent' },
  'create-emph': { classes: ['line-accent', 'dashed'], marker: 'open-accent' },
};

/** Classes by tone for the card look: filled head, tinted bar, outlined figure. */
const TONED = Object.fromEntries(
  TONE_NAMES.flatMap((tone) => [`tone-${tone}`, `tint-${tone}`, `outline-${tone}`].map((name) => [name, one(name)])),
);

/** Role to classes for both looks (ADR 0008): the card look uses more roles, never other classes for the same. */
const ROLES: Record<string, RoleStyle> = {
  ...PART_ROLES,
  head: one('shape'),
  headExternal: one('seq-external'),
  figure: one('seq-figure'),
  figureExternal: one('seq-figure-external'),
  stroke: one('line'),
  strokeExternal: one('line', 'dashed'),
  lifeline: one('seq-lifeline'),
  activation: one('seq-activation'),
  frame: one('seq-frame'),
  tag: one('seq-tag'),
  separator: one('seq-separator'),
  ref: one('seq-activation'),
  note: one('seq-note'),
  destroy: one('seq-destroy'),
  knockout: one('label-back'),
  dot: one('seq-dot'),
  guide: one('seq-lifeline'),
  bracket: one('seq-frame'),
  divider: one('seq-frame'),
  state: one('seq-activation'),
  coregion: one('seq-frame'),
  name: one('label-bold'),
  stereo: one('uml-stereo'),
  message: one('seq-message'),
  messageEmph: one('seq-message-accent'),
  tagText: one('seq-tag-text'),
  guard: one('seq-guard'),
  noteText: one('label-note'),
  number: one('seq-tag-text'),
  constraint: one('seq-guard'),
  ...MESSAGES,
  cardShadow: one('card-shadow'),
  cardRef: one('card-ref'),
  cardFrame: one('card-frame'),
  cardBox: one('card-box'),
  cardTag: one('card-tag'),
  cardName: one('card-head-text'),
  cardStereo: one('card-head-sub'),
  cardEdge: one('card-head-edge'),
  ...TONED,
};

/** The style table of sequence diagrams: the kernel's standard look plus the sequence rules (ADR 0010). */
export const SEQUENCE_STYLES: Styles = standardStyles({
  roles: ROLES,
  rules: [...BEFORE, ...SEQUENCE, ...AFTER],
  fonts: FONTS,
});
