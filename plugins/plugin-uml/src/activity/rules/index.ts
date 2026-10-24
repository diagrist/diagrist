import {
  expansionCrossing,
  expansionEmpty,
  finalInBranch,
  implicitJoin,
  mergeAfterFork,
  regionWithoutInterrupt,
} from './branches.js';
import { exceptionHandler, expansionControl, expansionInput, interruptingEdge, objectFlow, pinNames } from './flows.js';
import { activityEnds, controlArity, decisionInputs, guards, joinAfterDecision } from './nodes.js';
import type { ActivityRule } from './shared.js';
import {
  controlWidth,
  decisionOutgoing,
  guardMissing,
  guardsIncomplete,
  initialCount,
  noEnd,
  unreachable,
} from './warnings.js';

/** All rules of activity diagrams, errors first, in the order of their codes. */
export const ACTIVITY_RULES: readonly ActivityRule[] = [
  activityEnds,
  decisionInputs,
  controlArity,
  guards,
  objectFlow,
  joinAfterDecision,
  interruptingEdge,
  pinNames,
  exceptionHandler,
  expansionInput,
  expansionControl,
  initialCount,
  decisionOutgoing,
  controlWidth,
  guardMissing,
  guardsIncomplete,
  unreachable,
  noEnd,
  mergeAfterFork,
  finalInBranch,
  implicitJoin,
  regionWithoutInterrupt,
  expansionCrossing,
  expansionEmpty,
];
