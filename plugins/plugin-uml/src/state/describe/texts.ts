import type { Locale } from '@diagrist/lang';
import { STATE_DE } from './de.js';
import { STATE_EN } from './en.js';
import type { StateProse } from './prose.js';

/** Name of the kind before the title, as in `State machine diagram (UML) · Order`, by locale. */
export const STATE_NAME: Readonly<Record<Locale, string>> = {
  en: 'State machine diagram (UML)',
  de: 'Zustandsdiagramm (UML)',
};

/** Sentences of the description by locale; the type makes a missing locale a compile error. */
export const STATE_PROSE: Readonly<Record<Locale, StateProse>> = { en: STATE_EN, de: STATE_DE };
