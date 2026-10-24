import type { RoleStyle } from '@diagrist/core';

const one = (...classes: string[]): RoleStyle => ({ classes });

/**
 * The roles the shared parts put into a scene, styled with the base rules of the standard look. A plugin spreads
 * them into its own role table; a role it names again wins.
 */
export const PART_ROLES: Readonly<Record<string, RoleStyle>> = {
  title: one('label-title'),
  subtitle: one('label-note'),
  mark: one('mark'),
  markText: one('mark-text'),
  stripHeading: one('label-group'),
  decision: one('shape'),
  decisionOpen: one('frame'),
  decisionChoice: one('label-bold'),
  decisionNote: one('label-note'),
  legendRule: one('line'),
  legend: one('legend'),
  legendText: one('label-note'),
};
