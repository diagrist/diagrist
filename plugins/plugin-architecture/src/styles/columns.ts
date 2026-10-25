import { MARKER_SHAPES, type Marker, type RoleStyle, rule, STROKES, type StyleRule, textRule } from '@diagrist/core';
import type { LookFonts, Paint } from '../looks/look.js';
import type { Strokes } from './rules.js';

const STROKES_OF_COLUMNS: Strokes = { ...STROKES, line: 1, accent: 2, data: 2, shape: 1.25, emph: 2, frame: 1 };

/**
 * The colours of a technical sheet: white ground and black ink, a second ink dark enough for a page printed in
 * grey, grey heads, one blue for the emphasized element, green and red only for status.
 */
const INK = {
  ground: '#ffffff',
  ink: '#111111',
  ink2: '#4d4d4d',
  rule: '#8a8a8a',
  head: '#ededed',
  accent: '#1d4ed8',
  planned: '#1a7f37',
  deprecated: '#cf222e',
} as const;

const r = (...classes: string[]): RoleStyle => ({ classes });

/** Icons in ink, drawn with square ends like the boxes. */
const iconPaint = (name: 'ink' | 'muted'): Record<string, RoleStyle> => ({
  [`icon-fill-${name}`]: { classes: [], paint: `fill="${INK.ink}"` },
  [`icon-line-${name}`]: {
    classes: [],
    paint: `fill="none" stroke="${INK.ink}" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="miter"`,
  },
});

/**
 * Roles drawn differently from the standard look: one square box for every element whatever its role or status,
 * the emphasized one in the blue frame, every frame dashed, details of edges in the second ink, flow numbers of the
 * accent flow filled, the heads of bands, the sheet's kicker, sentences and notes, and the context of `focus: dim`.
 */
const COLUMNS_ROLES: Readonly<Record<string, RoleStyle>> = {
  boxMuted: r('shape'),
  boxPlanned: r('shape'),
  boxDeprecated: r('shape'),
  boxEmph: r('shape-emph'),
  boxEmphAdded: r('shape-added'),
  nameDeprecated: r('label-bold'),
  description: r('label-description'),
  tech: r('label-tech'),
  tabGap: r('gap'),
  frame: r('zone'),
  frameOwn: r('zone'),
  frameShared: r('zone'),
  frameExternal: r('zone'),
  statusPlanned: r('dot-planned'),
  statusDeprecated: r('dot-deprecated'),
  kicker: r('label-group'),
  badgeAccent: r('badge-accent'),
  badgeTextAccent: r('badge-text-accent'),
  edgeLabelAccent: r('label', 'halo'),
  edgeDetail: r('label-detail', 'halo'),
  edgeDetailAccent: r('label-detail', 'halo'),
  bandHead: r('band'),
  bandTitle: r('band-title'),
  bandSubtitle: r('band-subtitle'),
  separator: r('separator'),
  context: r('context'),
  marginRule: r('hairline'),
  marginId: r('margin-id'),
  marginText: r('margin-text'),
  marginChoice: r('margin-choice'),
  legendText: r('margin-text'),
  ...iconPaint('ink'),
  ...iconPaint('muted'),
};

/** Every arrowhead an open angle, in the colour of its line. */
const COLUMNS_MARKERS: readonly Marker[] = [
  { id: 'open', shape: MARKER_SHAPES.hook, name: 'arrow-open' },
  { id: 'filled', shape: MARKER_SHAPES.hook, name: 'arrow-open' },
  { id: 'open-accent', shape: MARKER_SHAPES.hook, name: 'arrow-open-accent' },
  { id: 'filled-accent', shape: MARKER_SHAPES.hook, name: 'arrow-open-accent' },
];

/** The rules of the technical sheet; a rule with the name of a standard one replaces it, the rest are its own. */
function columnsRules(f: LookFonts, w: Strokes): StyleRule[] {
  const c = INK;
  const line = (color: string, width: number) => `fill: none; stroke: ${color}; stroke-width: ${width};`;
  const text = (color: string, font: LookFonts[keyof LookFonts]) => textRule(`fill: ${color};`, font);
  return [
    rule('shape', `fill: ${c.ground}; stroke: ${c.ink}; stroke-width: ${w.shape};`),
    rule('shape-emph', `fill: ${c.ground}; stroke: ${c.accent}; stroke-width: ${w.emph};`),
    rule('zone', `${line(c.rule, w.frame)} stroke-dasharray: 4 4;`),
    rule('line', line(c.ink, w.line)),
    rule('line-accent', line(c.ink, w.accent)),
    rule('line-data', line(c.ink, w.data)),
    rule('line-data-accent', line(c.ink, w.data + 1)),
    rule('dashed', 'stroke-dasharray: 5 3;'),
    rule('arrow-open', `${line(c.ink, 1.2)} stroke-linejoin: miter;`),
    rule('arrow-open-accent', `${line(c.ink, 1.8)} stroke-linejoin: miter;`),
    rule('gap', `fill: ${c.ground}; stroke: none;`),
    rule('halo', `paint-order: stroke; stroke: ${c.ground}; stroke-width: 5px; stroke-linejoin: round;`),
    rule('label', text(c.ink, f.label)),
    rule('label-detail', text(c.ink2, f.label)),
    rule('label-bold', text(c.ink, f.name)),
    rule('label-title', text(c.ink, f.title)),
    rule('label-group', text(c.ink2, f.group)),
    rule('label-note', text(c.ink2, f.note)),
    rule('label-description', text(c.ink2, f.description)),
    rule('label-tech', text(c.ink2, f.tech)),
    rule('dot-planned', `fill: ${c.planned};`),
    rule('dot-deprecated', `fill: ${c.deprecated};`),
    rule('badge', `fill: ${c.ground}; stroke: ${c.ink}; stroke-width: 1.25;`),
    rule('badge-text', text(c.ink, f.badge)),
    rule('badge-accent', `fill: ${c.ink}; stroke: none;`),
    rule('badge-text-accent', text(c.ground, f.badge)),
    rule('mark', `fill: ${c.ground}; stroke: ${c.ink}; stroke-width: 1;`),
    rule('mark-text', text(c.ink, f.mark)),
    rule('note-box', `fill: ${c.ground}; stroke: ${c.ink2}; stroke-width: 1; stroke-dasharray: 4 3;`),
    rule('note-tail', `${line(c.ink2, 1)} stroke-dasharray: 4 3;`),
    rule('band', `fill: ${c.head}; stroke: none;`),
    rule('band-title', text(c.ink, f.heading)),
    rule('band-subtitle', text(c.ink2, f.large)),
    rule('separator', `${line(c.rule, 1.5)} stroke-linecap: round; stroke-dasharray: 0.1 5;`),
    rule('context', 'opacity: 0.5;'),
    rule('hairline', line(c.rule, 0.75)),
    rule('margin-id', text(c.ink, { ...f.label, weight: 600 })),
    rule('margin-text', text(c.ink2, f.label)),
    rule('margin-choice', text(c.ink, f.label)),
  ];
}

/** A diff picture (ADR 0021) in the sheet's inks: added heavy in ink, removed dotted in grey, tags with their sign. */
function columnsChanges(f: LookFonts): StyleRule[] {
  const c = INK;
  const tag = { ...f.badge, weight: 700 };
  return [
    rule('shape-added', `fill: ${c.ground}; stroke: ${c.ink}; stroke-width: 2.5;`),
    rule('shape-removed', `fill: ${c.ground}; stroke: ${c.rule}; stroke-width: 1; stroke-dasharray: 2 3;`),
    rule('line-added', `fill: none; stroke: ${c.ink}; stroke-width: 2.5;`),
    rule('line-removed', `fill: none; stroke: ${c.rule}; stroke-width: 1; stroke-dasharray: 2 3;`),
    rule('diff-tag-added', `fill: ${c.ink}; stroke: none;`),
    rule('diff-tag-removed', `fill: ${c.ground}; stroke: ${c.rule}; stroke-width: 1;`),
    rule('diff-tag-changed', `fill: ${c.ground}; stroke: ${c.ink}; stroke-width: 1;`),
    rule('diff-tag-text-light', textRule(`fill: ${c.ground};`, tag)),
    rule('diff-tag-text-removed', textRule(`fill: ${c.ink2};`, tag)),
    rule('diff-tag-text-accent', textRule(`fill: ${c.ink};`, tag)),
  ];
}

/**
 * The paint of a technical sheet: its roles and rules over the C4 table of the standard look, the root in unkerned
 * Inter (ADR 0022) on white, open arrowheads, only the rules a picture uses, and the words its legend needs for
 * what it draws differently from paper.
 */
export const COLUMNS_PAINT: Paint = {
  strokes: STROKES_OF_COLUMNS,
  roles: COLUMNS_ROLES,
  rules: columnsRules,
  changes: columnsChanges,
  root: 'note',
  fontKerning: 'none',
  canvas: INK.ground,
  markers: COLUMNS_MARKERS,
  usedOnly: true,
  sights: {
    en: {
      roles: { own: 'Dashed frame', shared: 'Dashed frame', external: 'Dashed frame' },
      emph: 'Blue frame',
      replicas: 'Stacked outlines',
      flow: (id, from, to, bold) =>
        `${from === to ? `Step ${from}` : `Steps ${from} to ${to}`}${bold ? ', heavy with filled numbers' : ''}: flow ${id}`,
    },
    de: {
      roles: { own: 'Gestrichelter Rahmen', shared: 'Gestrichelter Rahmen', external: 'Gestrichelter Rahmen' },
      emph: 'Blauer Rahmen',
      replicas: 'Gestapelte Rahmen',
      flow: (id, from, to, bold) =>
        `${from === to ? `Schritt ${from}` : `Schritte ${from} bis ${to}`}${bold ? ', kräftig mit gefüllten Nummern' : ''}: Flow ${id}`,
    },
  },
};
