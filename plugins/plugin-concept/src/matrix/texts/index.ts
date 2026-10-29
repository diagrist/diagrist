import type { Locale } from '@diagrist/lang';
import { DE } from './de.js';
import { EN } from './en.js';
import type { MatrixWords } from './words.js';

/** The words of matrices by locale; the type makes a missing locale a compile error. */
export const MATRIX_WORDS: Readonly<Record<Locale, MatrixWords>> = { en: EN, de: DE };
