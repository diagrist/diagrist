import { COLORS, type RoleStyle, TONE_NAMES } from '@diagrist/core';
import { PART_ROLES } from '@diagrist/parts';
import type { EdgeKind } from '../grammar/edges.js';

const r = (...classes: string[]): RoleStyle => ({ classes });
const each = (make: (tone: string) => [string, RoleStyle]): Record<string, RoleStyle> =>
  Object.fromEntries(TONE_NAMES.map(make));

/** Line class, dash and arrowhead of each kind of edge: what the arrow of the table means, drawn. */
export const EDGE_LOOK: Readonly<
  Record<EdgeKind, { line: 'line' | 'line-data'; dashed: boolean; head?: 'filled' | 'open' }>
> = {
  sync: { line: 'line', dashed: false, head: 'filled' },
  async: { line: 'line', dashed: true, head: 'open' },
  dependency: { line: 'line', dashed: true, head: 'open' },
  data: { line: 'line-data', dashed: false, head: 'filled' },
  link: { line: 'line', dashed: false },
  duplex: { line: 'line', dashed: false, head: 'filled' },
};

/**
 * Roles of edges, `edge-<kind>` and `edge-<kind>-accent`, with their arrowheads, and those of a diff picture (ADR
 * 0021): `edge-<kind>-added` thick in the accent colour, `edge-<kind>-removed` thin, grey and dotted.
 */
function edgeRoles(): Record<string, RoleStyle> {
  return Object.fromEntries(
    Object.entries(EDGE_LOOK).flatMap(([kind, look]) => [
      ...[false, true].map((accent): [string, RoleStyle] => {
        const line = accent ? `${look.line}-accent` : look.line;
        const marker = look.head && (accent ? `${look.head}-accent` : look.head);
        return [
          `edge-${kind}${accent ? '-accent' : ''}`,
          { classes: look.dashed ? [line, 'dashed'] : [line], ...(marker ? { marker } : {}) },
        ];
      }),
      [`edge-${kind}-added`, { classes: ['line-added'], ...(look.head ? { marker: `${look.head}-accent` } : {}) }],
      [`edge-${kind}-removed`, { classes: ['line-removed'], ...(look.head ? { marker: look.head } : {}) }],
    ]),
  );
}

/** Paint of icons as the predecessor wrote it inline, by stroke and colour (docs/burn-down.md). */
function iconRoles(): Record<string, RoleStyle> {
  const colors = { ink: COLORS.stroke, muted: COLORS.note, white: '#ffffff' } as const;
  return Object.fromEntries(
    Object.entries(colors).flatMap(([name, color]) => [
      [`icon-fill-${name}`, { classes: [], paint: `fill="${color}"` }],
      [
        `icon-line-${name}`,
        {
          classes: [],
          paint: `fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`,
        },
      ],
    ]),
  );
}

/**
 * Roles of C4 pictures (ADR 0008 Nr. 1): what a shape is, mapped to the classes of the standard look. Looks share
 * the roles; a theme repaints them.
 */
export const ARCHITECTURE_ROLES: Readonly<Record<string, RoleStyle>> = {
  ...PART_ROLES,
  box: r('shape'),
  boxMuted: r('shape-muted'),
  boxEmph: r('shape-emph'),
  boxPlanned: r('shape-planned'),
  boxDeprecated: r('shape-deprecated'),
  boxAdded: r('shape-added'),
  boxEmphAdded: r('shape-added'),
  boxRemoved: r('shape-removed'),
  diffTagAdded: r('diff-tag-added'),
  diffTagAddedText: r('diff-tag-text-light'),
  diffTagRemoved: r('diff-tag-removed'),
  diffTagRemovedText: r('diff-tag-text-removed'),
  diffTagChanged: r('diff-tag-changed'),
  diffTagChangedText: r('diff-tag-text-accent'),
  detail: r('line'),
  detailDeprecated: r('line-deprecated'),
  name: r('label-bold'),
  nameDeprecated: r('label-deprecated'),
  tech: r('label-note'),
  description: r('label-note'),
  status: r('label-status'),
  replica: r('replica'),
  replicaText: r('replica-text'),
  head: r('shape'),
  limb: r('line'),
  frame: r('frame'),
  frameOwn: r('frame-own'),
  frameShared: r('frame'),
  frameExternal: r('frame'),
  frameTitle: r('label-group'),
  frameTeam: r('label-note'),
  tag: r('tone-red', 'block-edge'),
  tagText: r('block-light'),
  card: r('card'),
  cardShadow: r('card-shadow'),
  knockout: r('knockout'),
  frameTitleOnLine: r('label-group-large'),
  blockShadow: r('block-shadow'),
  blockLight: r('block-light'),
  blockDark: r('block-dark'),
  blockCap: r('block-cap'),
  blockFlow: r('block-flow'),
  blockFlowHead: r('block-flow-head'),
  blockTitle: r('block-title'),
  edgeHalo: r('line', 'halo'),
  edgeLabel: r('label', 'halo'),
  edgeLabelAccent: r('label-accent', 'halo'),
  edgeLabelBare: r('label'),
  edgeLabelBareAccent: r('label-accent'),
  badge: r('badge'),
  badgeAccent: r('badge-accent'),
  badgeText: r('badge-text'),
  noteBox: r('note-box'),
  noteTail: r('note-tail'),
  noteText: r('label-note'),
  layerLine: r('annotation-line'),
  layerBox: r('annotation-box'),
  layerArrow: r('annotation-arrow'),
  layerText: r('label-note'),
  legendRule: { classes: ['line'], paint: `stroke="${COLORS.grid}" stroke-width="1"` },
  ...edgeRoles(),
  ...iconRoles(),
  ...each((t) => [`tint-${t}`, r(`tint-${t}`)]),
  ...each((t) => [`fill-${t}`, r(`tone-${t}`)]),
  ...each((t) => [`block-${t}`, r(`tone-${t}`, 'block-edge')]),
  ...each((t) => [`toned-${t}`, r(`line-${t}`)]),
  ...each((t) => [`toned-${t}-dashed`, r(`line-${t}`, 'dashed')]),
  ...each((t) => [`edge-halo-${t}`, r('line', `halo-${t}`)]),
  ...each((t) => [`label-halo-${t}`, r('label', `halo-${t}`)]),
  ...each((t) => [`label-accent-halo-${t}`, r('label-accent', `halo-${t}`)]),
};
