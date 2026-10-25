import { COLORS as c, DASH, rule, type StyleRule } from '@diagrist/core';

/** CSS rules several plugins write alike, by the role they play in their stylesheets. */
export interface SharedRules {
  /** A white card with a grey outline. */
  readonly card: StyleRule;
  /** The grey offset behind a card. */
  readonly shadow: StyleRule;
  /** The dashed box of a note on the canvas. */
  readonly noteBox: StyleRule;
  /** The dashed tip from a note to what it is on. */
  readonly noteTail: StyleRule;
}

/**
 * The card and note rules in the standard palette, outlines `frame` pixels wide. They come as single rules, not a
 * block, so each plugin places them where its stylesheet has always had them and the order of its rules stays.
 */
export const sharedRules = (frame: number): SharedRules => ({
  card: rule('card', `fill: ${c.fill}; stroke: ${c.grid}; stroke-width: ${frame};`),
  shadow: rule('card-shadow', `fill: ${c.grid}; stroke: none;`),
  noteBox: rule(
    'note-box',
    `fill: ${c.canvas}; stroke: ${c.note}; stroke-width: ${frame}; stroke-dasharray: ${DASH.frame};`,
  ),
  noteTail: rule(
    'note-tail',
    `fill: none; stroke: ${c.note}; stroke-width: ${frame}; stroke-dasharray: ${DASH.frame};`,
  ),
});
