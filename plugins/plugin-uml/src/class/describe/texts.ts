import type { Locale } from '@diagrist/lang';
import { CLASS_DE } from './de.js';
import { CLASS_EN } from './en.js';
import type { ClassProse } from './prose.js';

/** Name of the kind before the title, as in `Class diagram (UML) · Orders`, by locale. */
export const CLASS_NAME: Readonly<Record<Locale, string>> = {
  en: 'Class diagram (UML)',
  de: 'Klassendiagramm (UML)',
};

/** Sentences of the description by locale; the type makes a missing locale a compile error. */
export const CLASS_PROSE: Readonly<Record<Locale, ClassProse>> = { en: CLASS_EN, de: CLASS_DE };
