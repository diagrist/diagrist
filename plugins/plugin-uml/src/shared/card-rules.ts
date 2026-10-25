import {
  COLORS as c,
  rule,
  STANDARD_FONTS,
  type StyleRule,
  TONE_NAMES,
  TONES,
  textRule,
  STROKES as w,
} from '@diagrist/core';
import { sharedRules } from '@diagrist/parts';

/** Tinted areas of the card look: opacity of fill and outline. */
const TINT = { fill: 0.07, stroke: 0.45 } as const;

/**
 * CSS rules of the card look and of the dashed note that several UML kinds write alike, the card and note rules of
 * `parts` among them. Each kind's stylesheet places them where the predecessor wrote them, so the order of its rules,
 * and with it its bytes, stays.
 */
export const CARD_RULES = {
  ...sharedRules(w.frame),
  box: rule('card-box', `fill: ${c.fill}; stroke: ${c.border}; stroke-width: ${w.frame};`),
  name: rule('card-head-text', textRule('fill: #ffffff;', STANDARD_FONTS.name)),
  stereo: rule('card-head-sub', textRule('fill: #ffffff; fill-opacity: 0.85;', STANDARD_FONTS.note)),
} as const;

/** A tinted area per tone of the card look, `tint-<tone>`: the tone faint inside, stronger on the outline. */
export const TINT_RULES: readonly StyleRule[] = TONE_NAMES.map((tone) =>
  rule(
    `tint-${tone}`,
    `fill: ${TONES[tone]}; fill-opacity: ${TINT.fill}; stroke: ${TONES[tone]}; stroke-opacity: ${TINT.stroke}; stroke-width: ${w.frame};`,
  ),
);

/** A shape outlined in its tone per tone of the card look, `outline-<tone>`, filled like a node. */
export const OUTLINE_RULES: readonly StyleRule[] = TONE_NAMES.map((tone) =>
  rule(
    `outline-${tone}`,
    `fill: ${c.fill}; stroke: ${TONES[tone]}; stroke-width: ${w.shape}; stroke-linecap: round; stroke-linejoin: round;`,
  ),
);
