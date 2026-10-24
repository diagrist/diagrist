import { type RoleStyle, type Styles, standardStyles } from '@diagrist/core';
import { MARKER_SIZE, UML_BOX_ROLES, UML_BOX_RULES, UML_MARKERS } from '../shared/box-styles.js';
import type { RelationKind } from './diagram.js';
import { CLASS_FONTS as F } from './layout/metrics.js';

const one = (...classes: string[]): RoleStyle => ({ classes });

/** Line, dashing and end symbols per relation kind; `end` sits at `to`, `start` at `from`. */
export const LINE: Readonly<Record<RelationKind, { dashed?: boolean; end?: string; start?: string }>> = {
  association: {},
  directed: { end: 'uml-open' },
  bidirectional: { end: 'uml-open', start: 'uml-open' },
  dependency: { dashed: true, end: 'uml-open' },
  generalization: { end: 'hollow' },
  realization: { dashed: true, end: 'hollow' },
  aggregation: { start: 'diamond' },
  composition: { start: 'diamond-filled' },
};

/**
 * Roles `<kind>` and `<kind>-emph` with the symbol at `to`, `<kind>-bare` without it for lines drawn from the shared
 * target of a bundle, and `stub-<marker>` for a symbol at the end of an unpainted stub.
 */
const RELATION_ROLES: Record<string, RoleStyle> = Object.fromEntries([
  ...Object.entries(LINE).flatMap(([kind, l]) => {
    const style = (accent: boolean, end: boolean): RoleStyle => ({
      classes: [accent ? 'line-accent' : 'line', ...(l.dashed ? ['dashed'] : [])],
      ...(end && l.end ? { marker: `${l.end}${accent ? '-accent' : ''}` } : {}),
    });
    return [
      [kind, style(false, true)],
      [`${kind}-emph`, style(true, true)],
      [`${kind}-bare`, style(false, false)],
      [`${kind}-bare-emph`, style(true, false)],
    ];
  }),
  ...UML_MARKERS.map((m) => [`stub-${m.id}`, { classes: ['uml-stub'], marker: m.id }]),
]);

const ROLES: Record<string, RoleStyle> = {
  ...UML_BOX_ROLES,
  ...RELATION_ROLES,
  cross: one('line'),
  crossEmph: one('line-accent'),
  template: one('shape', 'dashed'),
  package: one('uml-package'),
  tether: one('uml-tether'),
};

/**
 * The style table of class diagrams: the kernel's standard look, the UML box rules, the end symbols in their own
 * size, which also scales the four standard heads the class kind never uses.
 */
export const CLASS_STYLES: Styles = (() => {
  const base = standardStyles({ roles: ROLES, rules: UML_BOX_RULES, fonts: F });
  return { ...base, markerSize: MARKER_SIZE, markers: [...base.markers, ...UML_MARKERS] };
})();
