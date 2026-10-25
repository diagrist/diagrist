import type { Origin } from '@diagrist/lang';

/** The ways a line of a diff picture differs from what its variant builds on (ADR 0021), in legend order. */
export const CHANGES = ['added', 'removed', 'changed'] as const;

/** One of `CHANGES`. */
export type Change = (typeof CHANGES)[number];

/**
 * The sign of each change, at the corner of a box, before an edge label and in the legend, so a diff picture reads
 * without colour: plus for new, a cross for gone, a tilde for changed.
 */
export const CHANGE_SIGN: Readonly<Record<Change, string>> = { added: '+', removed: '×', changed: '~' };

/** The change an origin stands for, or `undefined` for an unchanged line and outside diff pictures. */
export function changeOf(origin: Origin | undefined): Change | undefined {
  return origin === 'added' || origin === 'removed' || origin === 'changed' ? origin : undefined;
}

/**
 * An edge label with the sign of its change in front, joined by a no-break space so a wrapped label keeps it on its
 * first line; an edge without label gets the sign alone.
 */
export function signedLabel(label: string | undefined, origin: Origin | undefined): string | undefined {
  const change = changeOf(origin);
  if (change === undefined) return label;
  return label ? `${CHANGE_SIGN[change]}\u00a0${label}` : CHANGE_SIGN[change];
}
