import { extensionPoints, noteWithoutElement, relationAttributes, reservedStereotype } from './details.js';
import { associationEnds, generalizationEnds, includeCycle, includeExtendEnds } from './ends.js';
import type { UseCaseRule } from './shared.js';
import {
  directionWithoutEffect,
  emptySubject,
  extendDetails,
  idleActor,
  includeAndExtend,
  outsideSubject,
  withoutActor,
} from './warnings.js';

/** All rules of use case diagrams, errors first, in the order of their codes. */
export const USECASE_RULES: readonly UseCaseRule[] = [
  includeExtendEnds,
  associationEnds,
  generalizationEnds,
  extensionPoints,
  includeCycle,
  relationAttributes,
  reservedStereotype,
  noteWithoutElement,
  outsideSubject,
  withoutActor,
  extendDetails,
  idleActor,
  includeAndExtend,
  emptySubject,
  directionWithoutEffect,
];
