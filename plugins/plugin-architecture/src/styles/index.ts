import {
  FONT_STACKS,
  MARKER_SHAPES,
  type Marker,
  type StyleRule,
  type Styles,
  standardStyles,
  TONE_NAMES,
} from '@diagrist/core';
import { ICONS } from '../icons/index.js';
import type { Look } from '../looks/look.js';
import { compact } from '../model/compact.js';
import { ARCHITECTURE_ROLES } from './roles.js';
import { architectureRules } from './rules.js';

/**
 * The look's rules over the standard ones: a rule of the same name replaces it in place, the others follow in their
 * order.
 */
function overlay(base: readonly StyleRule[], own: readonly StyleRule[]): StyleRule[] {
  const replaced = new Map(own.map((r) => [r.name, r]));
  const known = new Set(base.map((r) => r.name));
  const kept = base.map((r) => replaced.get(r.name) ?? r);
  return [...kept, ...own.filter((r) => !known.has(r.name))];
}

/**
 * Heads of lines in a tone, filled in the tone and 2.4 times the size of the others, so the triangle is twice as
 * long as `markerSize`, in proportion to the thick toned line.
 */
const TONED_MARKERS: readonly Marker[] = TONE_NAMES.map((t) => ({
  id: `toned-${t}`,
  shape: MARKER_SHAPES.triangle,
  name: `tone-${t}`,
  scale: 2.4,
}));

/**
 * The style table of a look, one way for every look: the standard look with the C4 roles, rules and icons, the
 * look's roles and rules laid over them, the root in the font of `paint.root`, and canvas and arrowheads where the
 * look sets its own.
 */
export function stylesOf(look: Look): Styles {
  const { fonts, paint } = look;
  const base = standardStyles({
    roles: { ...ARCHITECTURE_ROLES, ...paint.roles },
    rules: architectureRules(fonts, paint.strokes, paint.changes(fonts, paint.strokes)),
    fonts,
    measures: { fonts, strokes: paint.strokes },
  });
  const { fontKerning, canvas, areaColors } = paint;
  const root = fonts[paint.root];
  return {
    ...base,
    fontFamily: root.family === undefined ? base.fontFamily : FONT_STACKS[root.family],
    fontSize: root.size,
    ...compact({ fontKerning, canvas, areaColors }),
    markers: [...(paint.markers ?? base.markers), ...TONED_MARKERS],
    markerSize: look.metrics.markerSize,
    rules: overlay(base.rules, paint.rules(fonts, paint.strokes)),
    icons: ICONS,
  };
}
