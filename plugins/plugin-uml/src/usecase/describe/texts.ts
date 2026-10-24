import type { Locale } from '@diagrist/lang';
import { USECASE_DE } from './de.js';
import { USECASE_EN } from './en.js';
import type { UseCaseProse } from './prose.js';

/** Name of the kind before the title, as in `Use case diagram (UML) · Shop`, by locale. */
export const USECASE_NAME: Readonly<Record<Locale, string>> = {
  en: 'Use case diagram (UML)',
  de: 'Use-Case-Diagramm (UML)',
};

/** Sentences of the description by locale; the type makes a missing locale a compile error. */
export const USECASE_PROSE: Readonly<Record<Locale, UseCaseProse>> = { en: USECASE_EN, de: USECASE_DE };
