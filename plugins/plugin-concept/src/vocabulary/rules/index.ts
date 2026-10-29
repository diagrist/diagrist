import type { Rule } from '@diagrist/core';
import { linkTypes } from '../../shared/rules/index.js';
import type { VocabularyModel } from '../model.js';

/** The rules of vocabulary files: every link joins declared types. The rules of the links hold in the pictures. */
export const VOCABULARY_RULES: readonly Rule<VocabularyModel>[] = [linkTypes];
