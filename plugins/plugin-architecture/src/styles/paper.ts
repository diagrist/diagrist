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
import { ICONS } from '../icons/index.js';
import type { Metrics } from '../layout/metrics.js';
import { ARCHITECTURE_ROLES } from './roles.js';
import { architectureRules, type Strokes } from './rules.js';

const PAPER_STROKES: Strokes = { ...STROKES, line: 1, accent: 1.5, data: 2, shape: 1, emph: 1.5, frame: 1 };

/** The colours of `look=paper`: warm paper and ink, one yellow for the core, green and red only for status. */
const PAPER = {
  paper: '#f7f6f3',
  node: '#ffffff',
  ink: '#222220',
  ink2: '#6f6d68',
  outline: '#8e8c8d',
  hairline: '#d9d7d2',
  zone: '#efede8',
  core: '#f6eb6a',
  planned: '#136c4d',
  deprecated: '#e55547',
} as const;

const r = (...classes: string[]): RoleStyle => ({ classes });

/** Icons in a quiet colour and finer than in the standard look, by the colour name of their role. */
const iconPaint = (name: 'ink' | 'muted', color: string): Record<string, RoleStyle> => ({
  [`icon-fill-${name}`]: { classes: [], paint: `fill="${color}"` },
  [`icon-line-${name}`]: {
    classes: [],
    paint: `fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"`,
  },
});

/**
 * Roles `look=paper` draws differently from the standard look: the core in yellow, status as a dot, zones as areas,
 * the second line as a description or a technology, the sheet's own kicker, legend sentence and margin notes.
 */
const PAPER_ROLES: Readonly<Record<string, RoleStyle>> = {
  boxEmph: r('shape-core'),
  boxPlanned: r('shape'),
  boxDeprecated: r('shape'),
  boxMuted: r('shape'),
  detail: r('shape-detail'),
  description: r('label-description'),
  tech: r('label-tech'),
  head: r('person'),
  limb: r('person'),
  frame: r('zone-open'),
  frameOwn: r('zone'),
  statusPlanned: r('dot-planned'),
  statusDeprecated: r('dot-deprecated'),
  kicker: r('label-group'),
  badgeAccent: r('badge'),
  edgeLabel: r('label'),
  edgeDetail: r('margin-text'),
  labelGap: r('gap'),
  labelGapZone: r('gap-zone'),
  legendRule: r('hairline'),
  legendText: r('margin-text'),
  marginRule: r('hairline'),
  marginId: r('margin-id'),
  marginText: r('margin-text'),
  marginChoice: r('margin-choice'),
  'edge-halo-zone': r('line', 'halo-zone'),
  'label-halo-zone': r('label', 'halo-zone'),
  'label-accent-halo-zone': r('label', 'halo-zone'),
  ...iconPaint('ink', PAPER.ink2),
  ...iconPaint('muted', PAPER.outline),
};

/** Every arrowhead open and thin, in the colour of its line. */
const PAPER_MARKERS: readonly Marker[] = [
  { id: 'open', shape: MARKER_SHAPES.hook, name: 'arrow-open' },
  { id: 'filled', shape: MARKER_SHAPES.hook, name: 'arrow-open' },
  { id: 'open-accent', shape: MARKER_SHAPES.hook, name: 'arrow-open-accent' },
  { id: 'filled-accent', shape: MARKER_SHAPES.hook, name: 'arrow-open-accent' },
];

/** The rules of `look=paper`; a rule with the name of a standard one replaces it, the rest are its own. */
function paperRules({ fonts: f }: Metrics): StyleRule[] {
  const c = PAPER;
  const line = (color: string, width: number) => `fill: none; stroke: ${color}; stroke-width: ${width};`;
  const halo = (color: string) =>
    `fill: none; paint-order: stroke; stroke: ${color}; stroke-width: 4px; stroke-linejoin: round;`;
  return [
    rule('shape', `fill: ${c.node}; stroke: ${c.outline}; stroke-width: 1;`),
    rule('shape-core', `fill: ${c.core}; stroke: ${c.ink}; stroke-width: 1.5;`),
    rule('shape-detail', line(c.outline, 1)),
    rule('person', `fill: ${c.node}; stroke: ${c.ink}; stroke-width: 1.2;`),
    rule('zone', `fill: ${c.zone}; stroke: none;`),
    rule('zone-open', `fill: none; stroke: ${c.hairline}; stroke-width: 1;`),
    rule('line', line(c.ink2, 1)),
    rule('line-accent', line(c.ink, 1.5)),
    rule('line-data', line(c.ink2, 2)),
    rule('line-data-accent', line(c.ink, 2)),
    rule('line-deprecated', line(c.outline, 1)),
    rule('dashed', 'stroke-dasharray: 4 3;'),
    rule('arrow-open', line(c.ink2, 1.1)),
    rule('arrow-open-accent', line(c.ink, 1.1)),
    rule('halo', `paint-order: stroke; stroke: ${c.paper}; stroke-width: 4px; stroke-linejoin: round;`),
    rule('halo-zone', halo(c.zone)),
    rule('label', textRule(`fill: ${c.ink};`, f.label)),
    rule('label-accent', textRule(`fill: ${c.ink};`, f.label)),
    rule('label-bold', textRule(`fill: ${c.ink};`, f.name)),
    rule('label-deprecated', textRule(`fill: ${c.ink2};`, f.name)),
    rule('label-title', textRule(`fill: ${c.ink};`, f.title)),
    rule('label-group', textRule(`fill: ${c.ink2};`, f.group)),
    rule('label-note', textRule(`fill: ${c.ink2};`, f.note)),
    rule('label-description', textRule(`fill: ${c.ink2};`, f.description)),
    rule('label-tech', textRule(`fill: ${c.ink2};`, f.tech)),
    rule('dot-planned', `fill: ${c.planned};`),
    rule('dot-deprecated', `fill: ${c.deprecated};`),
    rule('badge', `fill: ${c.paper}; stroke: ${c.ink}; stroke-width: 1;`),
    rule('badge-text', textRule(`fill: ${c.ink};`, f.badge)),
    rule('mark', `fill: ${c.node}; stroke: ${c.ink}; stroke-width: 1;`),
    rule('mark-text', textRule(`fill: ${c.ink};`, f.mark)),
    rule('replica', `fill: ${c.node}; stroke: ${c.hairline}; stroke-width: 1;`),
    rule('replica-text', textRule(`fill: ${c.ink2};`, f.replica)),
    rule('note-box', `fill: ${c.node}; stroke: ${c.outline}; stroke-width: 1; stroke-dasharray: 4 3;`),
    rule('note-tail', `fill: none; stroke: ${c.outline}; stroke-width: 1; stroke-dasharray: 4 3;`),
    rule('annotation-box', `fill: none; stroke: none;`),
    rule('annotation-line', line(c.hairline, 1)),
    rule('annotation-arrow', `fill: ${c.outline}; stroke: none;`),
    rule('gap', `fill: ${c.paper}; stroke: none;`),
    rule('gap-zone', `fill: ${c.zone}; stroke: none;`),
    rule('hairline', line(c.outline, 0.75)),
    rule('margin-id', textRule(`fill: ${c.ink};`, { ...f.label, weight: 600 })),
    rule('margin-text', textRule(`fill: ${c.ink2};`, f.label)),
    rule('margin-choice', textRule(`fill: ${c.ink};`, f.label)),
  ];
}

/**
 * The style table of `look=paper`: the C4 table of the standard look with the paper roles and rules laid over it,
 * the root in unkerned Inter (ADR 0022), open arrowheads, and only the rules a picture uses in its stylesheet.
 */
export function paperStyles(m: Metrics): Styles {
  const base = standardStyles({
    roles: { ...ARCHITECTURE_ROLES, ...PAPER_ROLES },
    rules: architectureRules(m.fontSize, PAPER_STROKES),
    fonts: m.fonts,
  });
  const own = paperRules(m);
  const replaced = new Map(own.map((r) => [r.name, r]));
  const known = new Set(base.rules.map((r) => r.name));
  const rules = base.rules.map(({ name, declarations }) => replaced.get(name) ?? { name, declarations });
  return {
    ...base,
    fontFamily: FONT_STACKS.inter,
    fontKerning: 'none',
    fontSize: m.fontSize.note,
    canvas: PAPER.paper,
    markerSize: m.markerSize,
    markers: PAPER_MARKERS,
    rules: [...rules, ...own.filter((r) => !known.has(r.name))],
    icons: ICONS,
  };
}
