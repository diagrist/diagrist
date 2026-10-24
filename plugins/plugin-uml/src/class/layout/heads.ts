import type { ClassRelation, RelationKind } from '../diagram.js';
import { CLASS } from './metrics.js';

/** An end symbol of a UML relation. */
export type Head = 'triangle' | 'diamond' | 'filled-diamond' | 'arrow';

/** At the target: the triangle at the superclass or interface, the open head of directed relations. */
export const HEAD_AT_END: Readonly<Record<RelationKind, Head | undefined>> = {
  association: undefined,
  directed: 'arrow',
  dependency: 'arrow',
  generalization: 'triangle',
  realization: 'triangle',
  aggregation: undefined,
  composition: undefined,
  bidirectional: 'arrow',
};

/** At the source: the diamond at the whole, the second head of `<->`. */
export const HEAD_AT_START: Readonly<Record<RelationKind, Head | undefined>> = {
  association: undefined,
  directed: undefined,
  dependency: undefined,
  generalization: undefined,
  realization: undefined,
  aggregation: 'diamond',
  composition: 'filled-diamond',
  bidirectional: 'arrow',
};

/** Room a symbol takes along the line. */
export function headLength(head: Head | undefined): number {
  if (head === 'triangle') return CLASS.triangle;
  if (head === 'diamond' || head === 'filled-diamond') return CLASS.diamond;
  return head === 'arrow' ? CLASS.arrow : 0;
}

const ASSOCIATIONS: ReadonlySet<RelationKind> = new Set([
  'association',
  'directed',
  'bidirectional',
  'aggregation',
  'composition',
]);

/**
 * Where an x for a non-navigable end sits. An end with an arrowhead is navigable; there, and on
 * relations that are no association, the x is left out (a rule reports it).
 */
export function crossEnds(r: ClassRelation): { readonly start: boolean; readonly end: boolean } {
  const x = r.nonav;
  if (!x || !ASSOCIATIONS.has(r.kind)) return { start: false, end: false };
  return {
    start: x !== 'to' && HEAD_AT_START[r.kind] !== 'arrow',
    end: x !== 'from' && HEAD_AT_END[r.kind] !== 'arrow',
  };
}
