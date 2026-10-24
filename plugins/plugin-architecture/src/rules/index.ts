import { layoutConstraints } from './areas.js';
import { edgeToOwnGroup, selfEdge, silentEdge, unmarkedDecision } from './edges.js';
import { gridTwice, placeInGrid } from './grid.js';
import { type ArchitectureRule, elementPlace, groupRole, noteTarget } from './presence.js';

/** All rules of C4 diagrams, errors first, in the order of their codes. */
export const ARCHITECTURE_RULES: readonly ArchitectureRule[] = [
  noteTarget,
  groupRole,
  elementPlace,
  placeInGrid,
  selfEdge,
  gridTwice,
  edgeToOwnGroup,
  layoutConstraints,
  silentEdge,
  unmarkedDecision,
];
