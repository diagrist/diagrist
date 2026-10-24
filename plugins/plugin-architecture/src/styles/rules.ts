import { COLORS as c, DASH, rule, type StyleRule, TONE_NAMES, TONES, textRule } from '@diagrist/core';
import type { FontSizes } from '../layout/metrics.js';

/** Stroke widths by what is drawn; `blocks` draws lines, accents and emphasis thicker. */
export interface Strokes {
  readonly line: number;
  readonly accent: number;
  readonly data: number;
  readonly shape: number;
  readonly emph: number;
  readonly frame: number;
  readonly frameOwn: number;
  readonly halo: number;
}

/** Fill and border opacity of toned frames, and of the halo a label keeps on them. */
const TINT = { fill: 0.07, stroke: 0.45 } as const;

const bold = (size: number) => ({ size, weight: 600 });

/**
 * The rules C4 adds after the base rules, in the predecessor's order. Only rules whose class the picture uses reach
 * the stylesheet, so pictures without these means keep their bytes.
 */
export function architectureRules(f: FontSizes, w: Strokes): StyleRule[] {
  const tones = TONE_NAMES.map((t) => [t, TONES[t]] as const);
  return [
    rule('annotation-box', `fill: ${c.fillMuted}; stroke: ${c.border}; stroke-width: ${w.frame};`),
    rule('annotation-line', `fill: none; stroke: ${c.border}; stroke-width: ${w.frame};`),
    rule('annotation-arrow', `fill: ${c.border}; stroke: none;`),
    rule(
      'shape-planned',
      `fill: ${c.fill}; stroke: ${c.stroke}; stroke-width: ${w.shape}; stroke-dasharray: ${DASH.line};`,
    ),
    rule('shape-deprecated', `fill: ${c.fillMuted}; stroke: ${c.border}; stroke-width: ${w.shape};`),
    rule('line-data', `fill: none; stroke: ${c.stroke}; stroke-width: ${w.data};`),
    rule('line-data-accent', `fill: none; stroke: ${c.accent}; stroke-width: ${w.data};`),
    rule('line-deprecated', `fill: none; stroke: ${c.border}; stroke-width: ${w.line};`),
    rule('label-deprecated', textRule(`fill: ${c.border};`, bold(f.node))),
    rule('label-status', `fill: ${c.note}; font-size: ${f.note}px; font-style: italic;`),
    rule('replica', `fill: ${c.fillMuted}; stroke: ${c.border}; stroke-width: ${w.frame};`),
    rule('replica-text', textRule(`fill: ${c.note};`, { size: f.badge - 1, weight: 700 })),
    rule('card', `fill: ${c.fill}; stroke: ${c.grid}; stroke-width: ${w.frame};`),
    rule('card-shadow', `fill: ${c.grid}; stroke: none;`),
    rule('card-frame', `fill: none; stroke: ${c.border}; stroke-width: ${w.frame};`),
    rule(
      'card-frame-dashed',
      `fill: none; stroke: ${c.border}; stroke-width: ${w.frame}; stroke-dasharray: ${DASH.frame};`,
    ),
    rule('card-frame-dotted', `fill: none; stroke: ${c.border}; stroke-width: ${w.frame}; stroke-dasharray: 1 3;`),
    rule('knockout', `fill: ${c.canvas}; stroke: none;`),
    rule(
      'note-box',
      `fill: ${c.canvas}; stroke: ${c.note}; stroke-width: ${w.frame}; stroke-dasharray: ${DASH.frame};`,
    ),
    rule('note-tail', `fill: none; stroke: ${c.note}; stroke-width: ${w.frame}; stroke-dasharray: ${DASH.frame};`),
    rule('label-group-large', `fill: ${c.note}; font-size: ${f.group + 4}px;`),
    rule('block-edge', `stroke: ${c.stroke}; stroke-width: ${w.emph};`),
    rule('block-shadow', `fill: ${c.border}; fill-opacity: 0.45; stroke: none;`),
    rule('block-light', textRule('fill: #ffffff;', bold(f.node + 1))),
    rule('block-dark', textRule(`fill: ${c.stroke};`, bold(f.node + 1))),
    rule('block-cap', `fill: #ffffff; fill-opacity: 0.3; stroke: ${c.stroke}; stroke-width: ${w.shape};`),
    rule('block-flow', `fill: none; stroke: ${c.border}; stroke-width: 3;`),
    rule('block-flow-head', `fill: ${c.border}; stroke: none;`),
    rule('block-title', textRule(`fill: ${c.stroke};`, bold(f.group + 4))),
    ...tones.map(([t, color]) => rule(`tone-${t}`, `fill: ${color};`)),
    ...tones.map(([t, color]) => rule(`line-${t}`, `fill: none; stroke: ${color}; stroke-width: ${w.line * 2};`)),
    ...tones.map(([t, color]) =>
      rule(
        `tint-${t}`,
        `fill: ${color}; fill-opacity: ${TINT.fill}; stroke: ${color}; stroke-opacity: ${TINT.stroke}; stroke-width: ${w.frame};`,
      ),
    ),
    ...tones.map(([t, color]) =>
      rule(
        `halo-${t}`,
        `fill: none; stroke: ${color}; stroke-opacity: ${TINT.fill}; stroke-width: ${w.halo}px; stroke-linejoin: round;`,
      ),
    ),
  ];
}
