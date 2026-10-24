import type { Locale } from '@diagrist/lang';
import { ACTIVITY_DE } from './de.js';
import { ACTIVITY_EN } from './en.js';
import type { ActivityProse } from './prose.js';

/** Name of the kind before the title, as in `Activity diagram (UML) · Order`, by locale. */
export const ACTIVITY_NAME: Readonly<Record<Locale, string>> = {
  en: 'Activity diagram (UML)',
  de: 'Aktivitätsdiagramm (UML)',
};

/** Sentences of the description by locale; the type makes a missing locale a compile error. */
export const ACTIVITY_PROSE: Readonly<Record<Locale, ActivityProse>> = { en: ACTIVITY_EN, de: ACTIVITY_DE };
