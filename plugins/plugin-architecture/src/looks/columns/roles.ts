import type { RoleStyle } from '@diagrist/core';
import type { EdgeKind } from '../../grammar/edges.js';
import { EDGE_LOOK } from '../../styles/roles.js';

/** The colours of `look=columns`: white ground, black ink, grey for context, one blue for focus and separators. */
export const INK = {
  ground: '#ffffff',
  band: '#efefef',
  ink: '#111111',
  grey: '#737373',
  context: '#c4c4c4',
  contextText: '#a3a3a3',
  accent: '#2563eb',
  step: '#fdebd3',
  stepContext: '#fdf5ea',
  okFill: '#d3f2dc',
  ok: '#2b8a3e',
  errorFill: '#f8d7d5',
  error: '#c92a2a',
} as const;

const r = (...classes: string[]): RoleStyle => ({ classes });

/** Icons in ink or in the grey of context, drawn with the line width of the boxes. */
const iconPaint = (name: 'ink' | 'muted', color: string): Record<string, RoleStyle> => ({
  [`icon-fill-${name}`]: { classes: [], paint: `fill="${color}"` },
  [`icon-line-${name}`]: {
    classes: [],
    paint: `fill="none" stroke="${color}" stroke-width="1.75" stroke-linecap="square" stroke-linejoin="miter"`,
  },
});

/** Edges outside the focus: the same line and dash as their kind, in the grey of context with a grey head. */
const contextEdges = (): Record<string, RoleStyle> =>
  Object.fromEntries(
    Object.entries(EDGE_LOOK).map(([kind, look]) => [
      `edge-${kind as EdgeKind}-context`,
      {
        classes: look.dashed ? [`${look.line}-context`, 'dashed'] : [`${look.line}-context`],
        ...(look.head ? { marker: 'context' } : {}),
      },
    ]),
  );

/**
 * Roles `look=columns` draws differently from the standard look, or adds: square boxes with their name cut into the
 * top edge, people as tinted areas, bands, separators, edge texts in three faces, the side column and the footer.
 */
export const COLUMNS_ROLES: Readonly<Record<string, RoleStyle>> = {
  box: r('col-box'),
  boxFocus: r('col-box-focus'),
  boxPlanned: r('col-box-planned'),
  boxDeprecated: r('col-box-deprecated'),
  boxContext: r('col-box-context'),
  tabGap: r('col-gap'),
  name: r('label-bold'),
  nameContext: r('col-name-context'),
  description: r('label-description'),
  tech: r('label-tech'),
  descriptionContext: r('col-description-context'),
  techContext: r('col-tech-context'),
  personArea: r('col-person'),
  personContext: r('col-person-context'),
  frame: r('col-zone'),
  frameTitle: r('col-zone-title'),
  frameTeam: r('col-zone-team'),
  band: r('col-band'),
  bandTitle: r('col-band-title'),
  bandSubtitle: r('col-band-subtitle'),
  separator: r('col-separator'),
  edgeVerb: r('col-verb'),
  edgeWords: r('col-words'),
  edgeDetail: r('label-tech'),
  edgeVerbContext: r('col-verb-context'),
  edgeWordsContext: r('col-words-context'),
  edgeDetailContext: r('col-tech-context'),
  badge: r('col-number'),
  badgeContext: r('col-number-context'),
  badgeText: r('badge-text'),
  mark: r('col-mark'),
  markText: r('mark-text'),
  panelText: r('col-panel'),
  panelQuestion: r('col-panel-question'),
  panelMuted: r('col-panel-muted'),
  panelContext: r('col-panel-context'),
  footerTitle: r('col-footer-title'),
  footer: r('col-footer'),
  noteBox: r('note-box'),
  noteTail: r('note-tail'),
  noteText: r('label-note'),
  ...contextEdges(),
  ...iconPaint('ink', INK.ink),
  ...iconPaint('muted', INK.context),
};
