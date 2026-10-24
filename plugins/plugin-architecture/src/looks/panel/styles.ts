import {
  FONT_STACKS,
  MARKER_SHAPES,
  type Marker,
  type RoleStyle,
  rule,
  type ShadowFilter,
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
import { PANEL_COLORS as c, PARTY_COLORS } from './colors.js';
import { PARTIES, type Party } from './party.js';

const STROKES_PANEL: Strokes = { ...STROKES, line: 1.5, accent: 2, data: 2.5, shape: 1, emph: 1.5, frame: 1 };

const r = (...classes: string[]): RoleStyle => ({ classes });

/** Icons in the colour of their party, drawn finer than in the standard look. */
const iconPaint = (party: Party): Record<string, RoleStyle> => ({
  [`icon-fill-${party}`]: { classes: [], paint: `fill="${PARTY_COLORS[party]}"` },
  [`icon-line-${party}`]: {
    classes: [],
    paint: `fill="none" stroke="${PARTY_COLORS[party]}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`,
  },
});

/** Roles `look=panel` draws differently from the standard look, and the roles only it has. */
const PANEL_ROLES: Readonly<Record<string, RoleStyle>> = {
  box: r('card'),
  boxEmph: r('card-focus'),
  boxPlanned: r('card-planned'),
  boxDeprecated: r('card-muted'),
  detail: r('card-detail'),
  description: r('label-description'),
  tech: r('label-description'),
  subtitle: r('label-description'),
  kicker: r('label-kicker'),
  dotGrid: r('dots'),
  boxFlat: r('card-flat'),
  focusSample: r('card-focus-flat'),
  panel: r('panel'),
  panelInner: r('panel-inner'),
  panelTitle: r('label-group'),
  panelTeam: r('label-faint'),
  personGlyph: r('person-glyph'),
  statusPlanned: r('status-planned'),
  statusDeprecated: r('status-deprecated'),
  pill: r('pill'),
  pillText: r('pill-text'),
  pillTextAccent: r('pill-text-accent'),
  pillDetail: r('pill-detail'),
  badge: r('badge'),
  badgeAccent: r('badge-accent'),
  badgeText: r('badge-text'),
  badgeTextAccent: r('badge-text-accent'),
  layerPill: r('layer-pill'),
  layerText: r('label-group'),
  legendCard: r('card-flat'),
  decisionCard: r('card-flat'),
  decisionCardOpen: r('card-open'),
  legendTitle: r('label-strong'),
  legendText: r('label-description'),
  decisionQuestion: r('label-description'),
  decisionChoice: r('label-bold'),
  decisionNote: r('label-faint'),
  'edge-halo-zone': r('line', 'halo-zone'),
  ...Object.fromEntries(PARTIES.map((p) => [`party-${p}`, r(`party-${p}`)])),
  ...Object.assign({}, ...PARTIES.map(iconPaint)),
};

/** Every arrowhead a small filled triangle in the colour of its line. */
const PANEL_MARKERS: readonly Marker[] = [
  { id: 'open', shape: MARKER_SHAPES.triangle, name: 'arrow-filled' },
  { id: 'filled', shape: MARKER_SHAPES.triangle, name: 'arrow-filled' },
  { id: 'open-accent', shape: MARKER_SHAPES.triangle, name: 'arrow-filled-accent' },
  { id: 'filled-accent', shape: MARKER_SHAPES.triangle, name: 'arrow-filled-accent' },
];

/** The smallest card that casts a shadow, a node of the panel grid; larger ones get a larger filter region. */
const CARD = { w: 200, h: 60 } as const;

/** Soft shadows: two close ones under every card, a deep one under the card in focus. */
const SHADOWS: readonly ShadowFilter[] = [
  {
    id: 'card',
    shadows: [{ dx: 0, dy: 2, blur: 3, color: c.ink, opacity: 0.08 }],
    smallest: CARD,
  },
  {
    id: 'focus',
    shadows: [
      { dx: 0, dy: 12, blur: 12, color: c.deep, opacity: 0.2 },
      { dx: 0, dy: 4, blur: 5, color: '#000000', opacity: 0.08 },
    ],
    smallest: CARD,
  },
];

/** The rules of `look=panel`; a rule with the name of a standard one replaces it, the rest are its own. */
function panelRules({ fonts: f, detailFont }: Metrics): StyleRule[] {
  const line = (color: string, width: number) => `fill: none; stroke: ${color}; stroke-width: ${width};`;
  const card = (stroke: string, width: number, rest = '') =>
    `fill: ${c.card}; stroke: ${stroke}; stroke-width: ${width};${rest}`;
  const mono = detailFont ?? f.label;
  return [
    rule('dots', `fill: none; stroke: ${c.border}; stroke-width: 2; stroke-linecap: round; stroke-dasharray: 0 16;`),
    rule('panel', `fill: ${c.panel}; stroke: none;`),
    rule('panel-inner', `fill: ${c.panelInner}; stroke: none;`),
    rule('card', card(c.border, 1, ' filter: url(#f-card);')),
    rule('card-focus', card(c.own, 1.5, ' filter: url(#f-focus);')),
    rule('card-flat', card(c.border, 1)),
    rule('card-focus-flat', card(c.own, 1.5)),
    rule('card-planned', card(c.edge, 1, ' stroke-dasharray: 5 4;')),
    rule('card-muted', `fill: ${c.panel}; stroke: ${c.border}; stroke-width: 1;`),
    rule('card-open', card(c.edge, 1, ' stroke-dasharray: 5 4;')),
    rule('card-detail', line(c.detail, 1)),
    rule('person-glyph', line(c.card, 1.6)),
    rule('line', line(c.edge, 1.5)),
    rule('line-accent', line(c.own, 2)),
    rule('line-data', line(c.edge, 2.5)),
    rule('line-data-accent', line(c.own, 2.5)),
    rule('line-deprecated', line(c.border, 1.5)),
    rule('dashed', 'stroke-dasharray: 5 4;'),
    rule('arrow-filled', `fill: ${c.edge}; stroke: none;`, true),
    rule('arrow-filled-accent', `fill: ${c.own}; stroke: none;`, true),
    rule('halo', `paint-order: stroke; stroke: ${c.card}; stroke-width: 5px; stroke-linejoin: round;`),
    rule('halo-zone', `stroke: ${c.panel}; stroke-width: 5px; stroke-linejoin: round;`),
    rule('label-title', textRule(`fill: ${c.ink};`, f.title)),
    rule('label-kicker', textRule(`fill: ${c.own};`, f.group)),
    rule('label-bold', textRule(`fill: ${c.ink};`, f.name)),
    rule('label-deprecated', textRule(`fill: ${c.faint};`, f.name)),
    rule('label-strong', textRule(`fill: ${c.ink};`, f.group)),
    rule('label-group', textRule(`fill: ${c.ink2};`, f.group)),
    rule('label-description', textRule(`fill: ${c.ink2};`, f.description)),
    rule('label-faint', textRule(`fill: ${c.faint};`, f.note)),
    rule('label-note', textRule(`fill: ${c.ink2};`, f.note)),
    rule('status-planned', textRule(`fill: ${c.planned};`, f.note)),
    rule('status-deprecated', textRule(`fill: ${c.negative};`, f.note)),
    rule('pill', card(c.border, 1)),
    rule('pill-text', textRule(`fill: ${c.ink2};`, f.label)),
    rule('pill-text-accent', textRule(`fill: ${c.own};`, f.label)),
    rule('pill-detail', textRule(`fill: ${c.faint};`, mono)),
    rule('badge', card(c.edge, 1)),
    rule('badge-accent', `fill: ${c.own}; stroke: none;`),
    rule('badge-text', textRule(`fill: ${c.ink2};`, f.badge)),
    rule('badge-text-accent', textRule(`fill: ${c.card};`, f.badge)),
    rule('mark', `fill: ${c.ownTint}; stroke: none;`),
    rule('mark-text', textRule(`fill: ${c.own};`, f.mark)),
    rule('replica', card(c.border, 1)),
    rule('replica-text', textRule(`fill: ${c.faint};`, f.replica)),
    rule('layer-pill', card(c.border, 1)),
    rule('note-box', `fill: ${c.amberTint}; stroke: none;`),
    rule('note-tail', `fill: none; stroke: ${c.amber}; stroke-width: 1; stroke-dasharray: 3 3;`),
    ...Object.entries(PARTY_COLORS).map(([p, color]) => rule(`party-${p}`, `fill: ${color};`)),
  ];
}

/**
 * The style table of `look=panel`: the C4 table of the standard look with the panel roles and rules laid over it,
 * the root in unkerned Geist on white, filled arrowheads, the card shadows, and only the rules a picture uses.
 */
export function panelStyles(m: Metrics): Styles {
  const base = standardStyles({
    roles: { ...ARCHITECTURE_ROLES, ...PANEL_ROLES },
    rules: architectureRules(m.fontSize, STROKES_PANEL),
    fonts: m.fonts,
  });
  const own = panelRules(m);
  const replaced = new Map(own.map((x) => [x.name, x]));
  const known = new Set(base.rules.map((x) => x.name));
  const rules = base.rules.map(({ name, declarations }) => replaced.get(name) ?? { name, declarations });
  return {
    ...base,
    fontFamily: FONT_STACKS.geist,
    fontKerning: 'none',
    fontSize: m.fontSize.note,
    canvas: c.card,
    markerSize: m.markerSize,
    markers: PANEL_MARKERS,
    shadows: SHADOWS,
    rules: [...rules, ...own.filter((x) => !known.has(x.name))],
    icons: ICONS,
  };
}
