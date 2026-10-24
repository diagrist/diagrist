import { rule, STANDARD_FONTS, STROKES, type StyleRule, type Styles, standardStyles, textRule } from '@diagrist/core';
import { ICONS } from '../icons/index.js';
import type { FontSizes } from '../layout/metrics.js';
import { metricsOf } from '../layout/metrics.js';
import type { Look } from '../model/types.js';
import { paperStyles } from './paper.js';
import { ARCHITECTURE_ROLES } from './roles.js';
import { architectureRules, type Strokes } from './rules.js';

const STANDARD_STROKES: Strokes = { ...STROKES, data: 2.5 };
const BLOCK_STROKES: Strokes = { ...STANDARD_STROKES, line: 3, accent: 3, emph: 3 };
const BLOCK_MARKER = 18;

/**
 * The base rules blocks draw larger and thicker: the same rules as the standard look, with the measures of the
 * blocks variant (ADR 0010: measures that change geometry make a variant, not a theme).
 */
function blockBase(f: FontSizes, w: Strokes): StyleRule[] {
  const ink = 'fill: #18181b;';
  const accent = 'fill: #1d4ed8;';
  return [
    rule('shape-emph', `fill: #ffffff; stroke: #18181b; stroke-width: ${w.emph};`, true),
    rule('line', `fill: none; stroke: #18181b; stroke-width: ${w.line};`, true),
    rule('line-accent', `fill: none; stroke: #1d4ed8; stroke-width: ${w.accent};`, true),
    rule('label', textRule(ink, { size: f.label }), true),
    rule('label-accent', textRule(accent, { size: f.label }), true),
    rule('label-bold', textRule(ink, { size: f.node, weight: 600 }), true),
    rule('label-title', textRule(ink, { size: f.title, weight: 600 }), true),
    rule('label-group', textRule(ink, { size: f.group, weight: 600 }), true),
    rule('label-note', textRule('fill: #52525b;', { size: f.note }), true),
    rule('arrow-open', `fill: none; stroke: #18181b; stroke-width: ${w.line};`, true),
    rule('arrow-open-accent', `fill: none; stroke: #1d4ed8; stroke-width: ${w.accent};`, true),
    rule('badge-text', textRule('fill: #ffffff;', { size: f.badge, weight: 700 }), true),
    rule('mark-text', textRule(accent, { size: f.badge - 1, weight: 700 }), true),
  ];
}

/**
 * The style table of a look: the standard look with the C4 rules and icons; blocks with their larger measures, paper
 * with its own fonts and colours.
 */
export function stylesOf(look: Look): Styles {
  const m = metricsOf(look);
  if (look === 'paper') return paperStyles(m);
  const f = m.fontSize;
  const strokes = look === 'blocks' ? BLOCK_STROKES : STANDARD_STROKES;
  const base = standardStyles({ roles: ARCHITECTURE_ROLES, rules: architectureRules(f, strokes), fonts: m.fonts });
  const styles = { ...base, icons: ICONS };
  if (look !== 'blocks') return styles;
  const bigger = new Map(blockBase(f, strokes).map((r) => [r.name, r]));
  return {
    ...styles,
    fontSize: f.group,
    markerSize: BLOCK_MARKER,
    rules: styles.rules.map((r) => bigger.get(r.name) ?? r),
    fonts: { ...STANDARD_FONTS, ...m.fonts },
  };
}
