import { abstractOperation, duplicateMember, memberProperty, memberSyntax } from './members.js';
import { compositeEnd, generalization, navigability, realizationTarget, typeLevelEnds } from './relations.js';
import type { ClassRule } from './shared.js';
import { associationClass, noteWithoutClassifier, packageOwnContent, packageRelation } from './structure.js';
import { ambiguousPair, associationMultiplicity, emptyPackage, naryEnds, naryLeg, packageCycle } from './warnings.js';

/** All rules of class diagrams, errors first, in the order of their codes. */
export const CLASS_RULES: readonly ClassRule[] = [
  realizationTarget,
  generalization,
  abstractOperation,
  memberSyntax,
  typeLevelEnds,
  compositeEnd,
  duplicateMember,
  associationClass,
  packageRelation,
  packageOwnContent,
  navigability,
  noteWithoutClassifier,
  associationMultiplicity,
  ambiguousPair,
  packageCycle,
  emptyPackage,
  memberProperty,
  naryEnds,
  naryLeg,
];
