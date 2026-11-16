import { COLORS as c, type RoleStyle, rule, type StyleRule, textRule } from '@diagrist/core';
import type { LookFonts } from '../looks/look.js';
import type { Strokes } from './rules.js';

const r = (...classes: string[]): RoleStyle => ({ classes });

/**
 * The roles of protocols set apart from their sentence (`protocols=`): smaller in ink or in the accent of a flow,
 * smaller in grey, in the label's size in grey italics, each with its halo, and a chip: its thin frame, which cuts
 * the line itself, and its text without halo.
 */
export const VIA_ROLES: Readonly<Record<string, RoleStyle>> = {
  edgeVia: r('label-via', 'halo'),
  edgeViaAccent: r('label-via-accent', 'halo'),
  edgeViaMuted: r('label-via-muted', 'halo'),
  edgeViaInline: r('label-via-inline', 'halo'),
  edgeViaChip: r('label-via'),
  edgeViaChipAccent: r('label-via-accent'),
  viaChip: r('via-chip'),
};

/** The rules of `VIA_ROLES`, in the look's fonts; the greys are the note grey and the border grey of the palette. */
export const viaRules = (fonts: LookFonts, w: Strokes): StyleRule[] => [
  rule('label-via', textRule(`fill: ${c.stroke};`, fonts.via)),
  rule('label-via-accent', textRule(`fill: ${c.accent};`, fonts.via)),
  rule('label-via-muted', textRule(`fill: ${c.note};`, fonts.via)),
  rule('label-via-inline', `${textRule(`fill: ${c.note};`, fonts.label)} font-style: italic;`),
  rule('via-chip', `fill: ${c.canvas}; stroke: ${c.border}; stroke-width: ${w.frame};`),
];
