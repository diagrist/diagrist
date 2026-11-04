import { linkTypes } from '../../shared/rules/index.js';
import { repeated, unknownLink, unknownType, usedProblem } from './declarations.js';
import { lonely, manyTypes, synonyms, unused } from './hygiene.js';
import { cycle, eachMissing, itself, singleBroken, unexplained, wrongTypes } from './relations.js';
import type { ConceptRule } from './shared.js';

/** The rules of concept pictures: the declared ones are errors, those of hygiene warnings. */
export const CONCEPT_RULES: readonly ConceptRule[] = [
  usedProblem,
  unknownType,
  unknownLink,
  linkTypes,
  repeated,
  wrongTypes,
  eachMissing,
  singleBroken,
  cycle,
  itself,
  unexplained,
  unused,
  manyTypes,
  lonely,
  synonyms,
];
