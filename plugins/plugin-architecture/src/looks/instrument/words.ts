import type { Locale } from '@diagrist/lang';
import type { ElementKeyword } from '../../grammar/elements.js';

/** What `look=instrument` writes itself, in capitals: the type of a box, its tags and the words of its legend. */
export interface InstrumentWords {
  /** The type in the micro label above a name; a neutral `node` has none. */
  readonly types: Readonly<Record<Exclude<ElementKeyword, 'node' | 'person'>, string>>;
  /** The black tag at the core element, and its entry in the legend. */
  readonly core: string;
  /** The orange tag of decisions in the legend. */
  readonly decision: string;
}

const EN: InstrumentWords = {
  types: { system: 'SYSTEM', container: 'CONTAINER', component: 'COMPONENT' },
  core: 'CORE',
  decision: 'DECISION',
};

const DE: InstrumentWords = {
  types: { system: 'SYSTEM', container: 'CONTAINER', component: 'KOMPONENTE' },
  core: 'KERN',
  decision: 'ENTSCHEIDUNG',
};

/** The words of `look=instrument` by locale; the type makes a missing locale a compile error. */
export const INSTRUMENT_WORDS: Readonly<Record<Locale, InstrumentWords>> = { en: EN, de: DE };
