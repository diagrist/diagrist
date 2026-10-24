import type { Locale } from '@diagrist/lang';
import type { Prose } from '../sequence/describe/prose.js';
import { DE } from './de.js';
import { EN } from './en.js';

/** Texts Diagrist adds to the picture (ADR 0008 Nr. 3). */
export interface Words {
  /** Name of the kind before the title, as in `Sequence diagram (UML) · Login`. */
  readonly sequence: string;
  /** Heading of the decision bar. */
  readonly decisions: string;
  /** Suffix of the question of an open decision. */
  readonly open: (who: string) => string;
}

/**
 * Everything the plugin writes in words, besides diagnostics, in one locale: the texts in the picture and the
 * sentences of the description. Diagnostics keep the kernel's catalogue form, by code (`messages/`).
 */
export interface Texts {
  readonly picture: Words;
  /** Sentences of the description of a sequence diagram. */
  readonly sequence: Prose;
}

/** The plugin's texts by locale; the type makes a missing locale a compile error. */
export const TEXTS: Readonly<Record<Locale, Texts>> = { en: EN, de: DE };

/** Title line of a picture: kind and title. */
export const imageTitle = (kind: string, title: string): string => `${kind} · ${title}`;
