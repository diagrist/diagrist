import { CODE_ROLES, type CodePalette, codeRules } from '@diagrist/code';
import { FONT_STACKS, type Font, MARKER_SHAPES, type RoleStyle, rule, type Styles, textRule } from '@diagrist/core';
import { PART_ROLES } from '@diagrist/parts';

/**
 * The colours of the sheet, those of the C4 look `paper`: warm paper and ink, one yellow for what matters. The code
 * card repeats them by value and imports nothing of the C4 plugin, since plugins stay apart.
 */
const PAPER = {
  paper: '#f7f6f3',
  card: '#ffffff',
  ink: '#222220',
  ink2: '#6f6d68',
  outline: '#8e8c8d',
  hairline: '#d9d7d2',
  core: '#f6eb6a',
  gutter: '#a9a7a2',
} as const;

/** Code on paper: one hue per role, dark enough for a grey print, the comment in the sheet's second ink. */
const CODE_INK: CodePalette = {
  keyword: '#8a3b8f',
  type: '#9a5b00',
  function: '#2457a6',
  string: '#3d7a32',
  literal: '#b04a1d',
  comment: PAPER.ink2,
  annotation: '#0f6e76',
  key: '#a3392f',
  fold: PAPER.gutter,
};

const inter = (size: number, weight?: number): Font => ({ size, family: 'inter', ...(weight ? { weight } : {}) });

/** Font roles: header in Inter as on paper, code and line numbers in JetBrains Mono, notes and labels in Inter. */
export const FONTS = {
  title: inter(15, 600),
  group: { ...inter(9.5, 600), letterSpacing: 0.7 },
  note: inter(11),
  cardTitle: inter(12, 600),
  cardMeta: { size: 9.5, family: 'jetbrains-mono' },
  code: { size: 11, family: 'jetbrains-mono' },
  noteText: inter(11),
  badge: inter(9.5, 600),
  label: inter(10.5),
} as const satisfies Readonly<Record<string, Font>>;

const one = (...classes: string[]): RoleStyle => ({ classes });

/** The roles a code diagram draws, the header's from `PART_ROLES` and the runs' from `CODE_ROLES`. */
const ROLES: Readonly<Record<string, RoleStyle>> = {
  ...PART_ROLES,
  ...CODE_ROLES,
  card: one('code-card'),
  cardRule: one('hairline'),
  cardTitle: one('card-title'),
  cardMeta: one('card-meta'),
  code: one('code-text'),
  number: one('code-number'),
  band: one('band'),
  bandEdge: one('band-edge'),
  badge: one('badge'),
  badgeText: one('badge-text'),
  noteText: one('note-text'),
  link: { classes: ['link'], marker: 'open' },
  linkLabel: one('link-label'),
};

const c = PAPER;
const f = FONTS;

/**
 * The style table of code diagrams, on its own rather than over the standard look, so a picture carries only the
 * rules it uses: the root in unkerned Inter (ADR 0022), the paper canvas, one thin open arrowhead.
 */
export const CODE_STYLES: Styles = {
  root: 'dia',
  fontFamily: FONT_STACKS.inter,
  fontKerning: 'none',
  fontSize: f.note.size,
  canvas: c.paper,
  markerSize: 8,
  markers: [{ id: 'open', shape: MARKER_SHAPES.hook, name: 'arrow' }],
  roles: ROLES,
  rules: [
    rule('label-title', textRule(`fill: ${c.ink};`, f.title)),
    rule('label-group', textRule(`fill: ${c.ink2};`, f.group)),
    rule('label-note', textRule(`fill: ${c.ink2};`, f.note)),
    rule('code-card', `fill: ${c.card}; stroke: ${c.outline}; stroke-width: 1;`),
    rule('hairline', `fill: none; stroke: ${c.hairline}; stroke-width: 1;`),
    rule('card-title', textRule(`fill: ${c.ink};`, f.cardTitle)),
    rule('card-meta', textRule(`fill: ${c.ink2};`, f.cardMeta)),
    rule('code-text', textRule(`fill: ${c.ink};`, f.code)),
    rule('code-number', textRule(`fill: ${c.gutter};`, f.code)),
    rule('band', `fill: ${c.core}; fill-opacity: 0.38; stroke: none;`),
    rule('band-edge', `fill: ${c.ink}; stroke: none;`),
    rule('badge', `fill: ${c.paper}; stroke: ${c.ink}; stroke-width: 1;`),
    rule('badge-text', textRule(`fill: ${c.ink};`, f.badge)),
    rule('note-text', textRule(`fill: ${c.ink};`, f.noteText)),
    rule('link', `fill: none; stroke: ${c.ink2}; stroke-width: 1;`),
    rule('arrow', `fill: none; stroke: ${c.ink2}; stroke-width: 1.1;`),
    rule('link-label', textRule(`fill: ${c.ink2};`, f.label)),
    ...codeRules(CODE_INK),
  ],
  fonts: f,
};
