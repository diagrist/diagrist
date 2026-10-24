import {
  COLORS as c,
  DASH,
  rule,
  STANDARD_FONTS,
  type StyleRule,
  TONE_NAMES,
  TONES,
  textRule,
  STROKES as w,
} from '@diagrist/core';

/** Tinted areas of the card look: opacity of fill and outline. */
const TINT = { fill: 0.07, stroke: 0.45 } as const;

/**
 * CSS rules of the card look and of the dashed tail of a note that several UML kinds write alike. Each kind's
 * stylesheet places them where the predecessor wrote them, so the order of its rules, and with it its bytes, stays.
 */
export const CARD_RULES = {
  card: rule('card', `fill: ${c.fill}; stroke: ${c.grid}; stroke-width: ${w.frame};`),
  shadow: rule('card-shadow', `fill: ${c.grid}; stroke: none;`),
  box: rule('card-box', `fill: ${c.fill}; stroke: ${c.border}; stroke-width: ${w.frame};`),
  name: rule('card-head-text', textRule('fill: #ffffff;', STANDARD_FONTS.name)),
  stereo: rule('card-head-sub', textRule('fill: #ffffff; fill-opacity: 0.85;', STANDARD_FONTS.note)),
  noteTail: rule(
    'note-tail',
    `fill: none; stroke: ${c.note}; stroke-width: ${w.frame}; stroke-dasharray: ${DASH.frame};`,
  ),
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
