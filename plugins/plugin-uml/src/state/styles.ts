import { type RoleStyle, type Styles, standardStyles } from '@diagrist/core';
import { MARKER_SIZE, UML_BOX_ROLES, UML_BOX_RULES, UML_MARKERS } from '../class/styles.js';
import { STATE_FONTS as F } from './layout/metrics.js';

const one = (...classes: string[]): RoleStyle => ({ classes });

const ROLES: Record<string, RoleStyle> = {
  ...UML_BOX_ROLES,
  filled: one('uml-filled'),
  separator: one('line', 'dashed'),
  transition: { classes: ['line'], marker: 'uml-open' },
  transitionEmph: { classes: ['line-accent'], marker: 'uml-open-accent' },
};

/**
 * The style table of state machine diagrams: the kernel's standard look with the rules of UML boxes, and the open
 * head of the predecessor's size at the target of every transition.
 */
export const STATE_STYLES: Styles = (() => {
  const base = standardStyles({ roles: ROLES, rules: UML_BOX_RULES, fonts: F });
  return { ...base, markerSize: MARKER_SIZE, markers: [...base.markers, ...UML_MARKERS] };
})();
