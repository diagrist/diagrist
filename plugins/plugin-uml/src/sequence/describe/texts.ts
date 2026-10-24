import type { Locale } from '@diagrist/lang';
import { SEQUENCE_DE } from './de.js';
import { SEQUENCE_EN } from './en.js';
import type { SequenceProse } from './prose.js';

/** Name of the kind before the title, as in `Sequence diagram (UML) · Login`, by locale. */
export const SEQUENCE_NAME: Readonly<Record<Locale, string>> = {
  en: 'Sequence diagram (UML)',
  de: 'Sequenzdiagramm (UML)',
};

/** Sentences of the description by locale; the type makes a missing locale a compile error. */
export const SEQUENCE_PROSE: Readonly<Record<Locale, SequenceProse>> = { en: SEQUENCE_EN, de: SEQUENCE_DE };
