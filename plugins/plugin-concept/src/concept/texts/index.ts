import type { Locale } from '@diagrist/lang';
import { DE } from './de.js';
import { EN } from './en.js';
import type { ConceptWords } from './words.js';

/** The words of concept pictures by locale; the type makes a missing locale a compile error. */
export const CONCEPT_WORDS: Readonly<Record<Locale, ConceptWords>> = { en: EN, de: DE };
