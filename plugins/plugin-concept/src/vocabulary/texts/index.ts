import type { Locale } from '@diagrist/lang';
import { DE } from './de.js';
import { EN } from './en.js';
import type { VocabularyWords } from './words.js';

/** The words of vocabulary pictures by locale; the type makes a missing locale a compile error. */
export const VOCABULARY_WORDS: Readonly<Record<Locale, VocabularyWords>> = { en: EN, de: DE };
