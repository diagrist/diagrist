import type { Locale } from '@diagrist/lang';
import type { ActivityProse } from '../activity/describe/prose.js';
import type { Prose } from '../sequence/describe/prose.js';
import type { UseCaseProse } from '../usecase/describe/prose.js';
import { DE } from './de.js';
import { EN } from './en.js';

/** Texts the plugin adds to the picture (ADR 0008 Nr. 3); those of title header and decision bar are in `parts`. */
export interface PictureWords {
  /** Name of the kind before the title, as in `Sequence diagram (UML) · Login`. */
  readonly sequence: string;
  /** Name of the kind before the title, as in `Use case diagram (UML) · Shop`. */
  readonly usecase: string;
  /** Name of the kind before the title, as in `Activity diagram (UML) · Order`. */
  readonly activity: string;
}

/**
 * Everything the plugin writes in words in one locale: the texts in the picture and the sentences of the
 * description. Diagnostics keep the kernel's catalogue form, by code (`messages/`); title header and decision bar
 * bring their own words (`WORDS` in `@diagrist/parts`).
 */
export interface Texts {
  readonly picture: PictureWords;
  /** Sentences of the description of a sequence diagram. */
  readonly sequence: Prose;
  /** Sentences of the description of a use case diagram. */
  readonly usecase: UseCaseProse;
  /** Sentences of the description of an activity diagram. */
  readonly activity: ActivityProse;
}

/** The plugin's texts by locale; the type makes a missing locale a compile error. */
export const TEXTS: Readonly<Record<Locale, Texts>> = { en: EN, de: DE };
