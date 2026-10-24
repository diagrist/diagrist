import {
  callWithoutReply,
  deactivateWithoutActivate,
  lostFoundCall,
  openActivation,
  replyWithoutCall,
} from './calls.js';
import {
  afterOperand,
  coregionContent,
  emptyOperand,
  missingGuard,
  singleOperand,
  thinCoregion,
  unlistedMessages,
} from './fragments.js';
import { frameEdgeGate, frameWithoutGate, gateUsedTwice } from './gates.js';
import { frameGate, lifecycle, lostFound, missingLifeline, unknownLifeline, unusedLifeline } from './lifelines.js';
import type { SequenceRule } from './shared.js';
import { durationNotDrawn, durationOrder } from './time.js';

/** All rules of sequence diagrams, errors first, in the order of their codes. */
export const SEQUENCE_RULES: readonly SequenceRule[] = [
  unknownLifeline,
  afterOperand,
  replyWithoutCall,
  lifecycle,
  deactivateWithoutActivate,
  lostFound,
  frameGate,
  unlistedMessages,
  missingLifeline,
  coregionContent,
  frameEdgeGate,
  singleOperand,
  callWithoutReply,
  unusedLifeline,
  emptyOperand,
  missingGuard,
  openActivation,
  durationOrder,
  lostFoundCall,
  durationNotDrawn,
  thinCoregion,
  frameWithoutGate,
  gateUsedTwice,
];
