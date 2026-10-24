import {
  type Font,
  rule,
  STANDARD_FONTS,
  STROKES,
  type StyleRule,
  type Styles,
  standardStyles,
  textRule,
} from '@diagrist/core';
import { ICONS } from '../icons/index.js';
import type { FontSizes } from '../layout/metrics.js';
import { metricsOf } from '../layout/metrics.js';
import type { Look } from '../model/types.js';
import { ARCHITECTURE_ROLES } from './roles.js';
import { architectureRules, type Strokes } from './rules.js';

const STANDARD_STROKES: Strokes = { ...STROKES, data: 2.5 };
const BLOCK_STROKES: Strokes = { ...STANDARD_STROKES, line: 3, accent: 3, emph: 3 };
const BLOCK_MARKER = 18;

/** Font roles of C4 pictures besides the standard ones: status, replica tag, blocks, card titles. */
function fontsOf(f: FontSizes): Record<string, Font> {
  return {
    title: { size: f.title, weight: 600 },
    name: { size: f.node, weight: 600 },
    group: { size: f.group, weight: 600 },
    label: { size: f.label },
    note: { size: f.note },
    badge: { size: f.badge, weight: 700 },
    mark: { size: f.badge - 1, weight: 700 },
    replica: { size: f.badge - 1, weight: 700 },
    block: { size: f.node + 1, weight: 600 },
    heading: { size: f.group + 4, weight: 600 },
    large: { size: f.group + 4 },
  };
}

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

/** The style table of a look: the standard look with the C4 rules and icons; blocks with their larger measures. */
export function stylesOf(look: Look): Styles {
  const f = metricsOf(look).fontSize;
  const strokes = look === 'blocks' ? BLOCK_STROKES : STANDARD_STROKES;
  const base = standardStyles({ roles: ARCHITECTURE_ROLES, rules: architectureRules(f, strokes), fonts: fontsOf(f) });
  const styles = { ...base, icons: ICONS };
  if (look !== 'blocks') return styles;
  const bigger = new Map(blockBase(f, strokes).map((r) => [r.name, r]));
  return {
    ...styles,
    fontSize: f.group,
    markerSize: BLOCK_MARKER,
    rules: styles.rules.map((r) => bigger.get(r.name) ?? r),
    fonts: { ...STANDARD_FONTS, ...fontsOf(f) },
  };
}
