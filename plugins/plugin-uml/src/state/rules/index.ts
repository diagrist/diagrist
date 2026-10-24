import {
  choiceComplete,
  deferNeverConsumed,
  deferOverridden,
  forkWithoutJoin,
  nondeterministic,
  selfTransitionBehaviour,
} from './branches.js';
import { postcondition, protocol, timeChangeEvent } from './events.js';
import { compositeWithoutInitial, pointUnused, regionWithoutInitial } from './frames.js';
import { deadEnd, initialRequired, unreachable } from './reach.js';
import type { StateRule } from './shared.js';
import {
  connectionPoint,
  invalidNesting,
  noteWithoutVertex,
  pointOnSimpleState,
  regionMisuse,
  submachine,
} from './structure.js';
import {
  elseTwice,
  forkJoinBranch,
  historyPlacement,
  oneInitial,
  pseudostateDegree,
  transitionEnds,
  triggerNotAllowed,
} from './vertices.js';

/** All rules of state machine diagrams, errors first, in the order of their codes. */
export const STATE_RULES: readonly StateRule[] = [
  transitionEnds,
  pseudostateDegree,
  triggerNotAllowed,
  oneInitial,
  historyPlacement,
  invalidNesting,
  forkJoinBranch,
  elseTwice,
  regionMisuse,
  connectionPoint,
  pointOnSimpleState,
  submachine,
  timeChangeEvent,
  protocol,
  postcondition,
  noteWithoutVertex,
  initialRequired,
  unreachable,
  deadEnd,
  choiceComplete,
  nondeterministic,
  selfTransitionBehaviour,
  compositeWithoutInitial,
  forkWithoutJoin,
  regionWithoutInitial,
  pointUnused,
  deferOverridden,
  deferNeverConsumed,
];
