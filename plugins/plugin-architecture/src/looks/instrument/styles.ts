import {
  FONT_STACKS,
  MARKER_SHAPES,
  type Marker,
  type RoleStyle,
  rule,
  STROKES,
  type StyleRule,
  type Styles,
  standardStyles,
  textRule,
} from '@diagrist/core';
import { ICONS } from '../../icons/index.js';
import type { Metrics } from '../../layout/metrics.js';
import { ARCHITECTURE_ROLES } from '../../styles/roles.js';
import { architectureRules, type Strokes } from '../../styles/rules.js';
import { INSTRUMENT_SHEET_FONTS } from './metrics.js';

const STROKE: Strokes = { ...STROKES, line: 1, accent: 1, data: 2, shape: 1, emph: 1.5, frame: 1, frameOwn: 1 };

/** The colours of `look=instrument`: light grey ground, white boxes, ink, a grey tag, one orange signal. */
const C = {
  ground: '#f1f2f2',
  node: '#ffffff',
  ink: '#231f20',
  grey: '#d1d3d4',
  signal: '#f15a22',
  second: '#6d6e70',
} as const;

const r = (...classes: string[]): RoleStyle => ({ classes });

/** Icons as fine line drawings in ink, filled ones in ink too, by the colour name of their role. */
const iconPaint = (name: 'ink' | 'muted'): Record<string, RoleStyle> => ({
  [`icon-fill-${name}`]: { classes: [], paint: `fill="${C.ink}"` },
  [`icon-line-${name}`]: {
    classes: [],
    paint: `fill="none" stroke="${C.ink}" stroke-width="1.4" stroke-linecap="square" stroke-linejoin="miter"`,
  },
});

/** Roles of the instrument's own shapes, and the shared ones it paints differently. */
const ROLES: Readonly<Record<string, RoleStyle>> = {
  box: r('shape'),
  boxEmph: r('shape-core'),
  detail: r('shape-detail'),
  micro: r('label-micro'),
  description: r('label-description'),
  knob: r('shape'),
  knobCore: r('knob-core'),
  frame: r('frame'),
  frameBar: r('frame-bar'),
  frameTeam: r('label-micro'),
  anchor: r('signal-dot'),
  kicker: r('label-micro'),
  subtitle: r('label-sub'),
  'tag-core': r('tag-core'),
  'tag-plain': r('tag-plain'),
  'tag-signal': r('tag-signal'),
  'tag-core-label': r('tag-label-light'),
  'tag-plain-label': r('tag-label-dark'),
  'tag-signal-label': r('tag-label-light'),
  'tag-core-badge': r('tag-mono-light'),
  'tag-plain-badge': r('tag-mono-dark'),
  'tag-signal-badge': r('tag-mono-light'),
  'tag-plain-group': r('label-group'),
  'leader-core': r('leader-core'),
  'leader-signal': r('leader-signal'),
  'leader-dot': r('signal-dot'),
  rail: r('rail'),
  sheetText: r('prose'),
  sheetChoice: r('prose-choice'),
  sheetNote: r('prose-note'),
  legendText: r('legend-text'),
  ...iconPaint('ink'),
  ...iconPaint('muted'),
};

/** Every arrowhead small and filled, in the ink of its line. */
const MARKERS: readonly Marker[] = [
  { id: 'open', shape: MARKER_SHAPES.triangle, name: 'arrow-filled' },
  { id: 'filled', shape: MARKER_SHAPES.triangle, name: 'arrow-filled' },
  { id: 'open-accent', shape: MARKER_SHAPES.triangle, name: 'arrow-filled' },
  { id: 'filled-accent', shape: MARKER_SHAPES.triangle, name: 'arrow-filled' },
];

/** The rules of `look=instrument`; a rule with the name of a standard one replaces it, the rest are its own. */
function rules({ fonts: f }: Metrics): StyleRule[] {
  const line = (color: string, width: number) => `fill: none; stroke: ${color}; stroke-width: ${width};`;
  const fill = (color: string) => `fill: ${color}; stroke: none;`;
  return [
    rule('shape', `fill: ${C.node}; stroke: ${C.ink}; stroke-width: 1;`),
    rule('shape-core', `fill: ${C.node}; stroke: ${C.ink}; stroke-width: 1.5;`),
    rule('shape-detail', line(C.ink, 1)),
    rule('knob-core', fill(C.ink)),
    rule('frame', line(C.ink, 1)),
    rule('frame-bar', `fill: ${C.grey}; stroke: ${C.ink}; stroke-width: 1;`),
    rule('signal-dot', fill(C.signal)),
    rule('line', line(C.ink, 1)),
    rule('line-accent', line(C.ink, 1)),
    rule('line-data', line(C.ink, 2)),
    rule('line-data-accent', line(C.ink, 2)),
    rule('dashed', 'stroke-dasharray: 3 3;'),
    rule('arrow-filled', fill(C.ink)),
    rule('halo', `paint-order: stroke; stroke: ${C.ground}; stroke-width: 4px; stroke-linejoin: round;`),
    rule('label-bold', textRule(`fill: ${C.ink};`, f.name)),
    rule('label-title', textRule(`fill: ${C.ink};`, f.title)),
    rule('label-group', textRule(`fill: ${C.ink};`, f.group)),
    rule('label-micro', textRule(`fill: ${C.second};`, f.tech)),
    rule('label-description', textRule(`fill: ${C.second};`, f.description)),
    rule('label-sub', textRule(`fill: ${C.second};`, f.badge)),
    rule('tag-core', fill(C.ink)),
    rule('tag-plain', fill(C.grey)),
    rule('tag-signal', fill(C.signal)),
    rule('tag-label-light', textRule(`fill: ${C.node};`, f.label)),
    rule('tag-label-dark', textRule(`fill: ${C.ink};`, f.label)),
    rule('tag-mono-light', textRule(`fill: ${C.node};`, f.badge)),
    rule('tag-mono-dark', textRule(`fill: ${C.ink};`, f.badge)),
    rule('leader-core', line(C.ink, 1)),
    rule('leader-signal', line(C.signal, 2)),
    rule('rail', line(C.second, 1)),
    rule('replica-text', textRule(`fill: ${C.ink};`, f.replica)),
    rule('note-box', `fill: ${C.node}; stroke: ${C.ink}; stroke-width: 1; stroke-dasharray: 3 3;`),
    rule('note-tail', `fill: none; stroke: ${C.ink}; stroke-width: 1; stroke-dasharray: 3 3;`),
    rule('label-note', textRule(`fill: ${C.second};`, f.note)),
    rule('prose', textRule(`fill: ${C.ink};`, f.note)),
    rule('prose-choice', textRule(`fill: ${C.ink};`, INSTRUMENT_SHEET_FONTS.choice)),
    rule('prose-note', textRule(`fill: ${C.second};`, f.note)),
    rule('legend-text', textRule(`fill: ${C.second};`, f.badge)),
  ];
}

/**
 * The style table of `look=instrument`: the C4 table of the standard look with the instrument's roles and rules laid
 * over it, the root in unkerned Space Grotesk (ADR 0022), small filled heads, and only the rules a picture uses.
 */
export function instrumentStyles(m: Metrics): Styles {
  const base = standardStyles({
    roles: { ...ARCHITECTURE_ROLES, ...ROLES },
    rules: architectureRules(m.fontSize, STROKE),
    fonts: { ...m.fonts, ...INSTRUMENT_SHEET_FONTS },
  });
  const own = rules(m);
  const replaced = new Map(own.map((x) => [x.name, x]));
  const known = new Set(base.rules.map((x) => x.name));
  const kept = base.rules.map(({ name, declarations }) => replaced.get(name) ?? { name, declarations });
  return {
    ...base,
    fontFamily: FONT_STACKS['space-grotesk'],
    fontKerning: 'none',
    fontSize: m.fontSize.note,
    canvas: C.ground,
    markerSize: m.markerSize,
    markers: MARKERS,
    rules: [...kept, ...own.filter((x) => !known.has(x.name))],
    icons: ICONS,
  };
}
