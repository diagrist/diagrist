import type { Locale } from '@diagrist/lang';

/** Texts Diagrist adds to the picture, by locale (ADR 0008 Nr. 3). */
export interface Words {
  /** Name of the kind before the title, as in `Sequence diagram (UML) · Login`. */
  readonly sequence: string;
  /** Heading of the decision bar. */
  readonly decisions: string;
  /** Suffix of the question of an open decision. */
  readonly open: (who: string) => string;
}

export const WORDS: Readonly<Record<Locale, Words>> = {
  en: {
    sequence: 'Sequence diagram (UML)',
    decisions: 'Decisions (marks in the picture)',
    open: (who) => `(open, ${who})`,
  },
  de: {
    sequence: 'Sequenzdiagramm (UML)',
    decisions: 'Entscheidungen (Marken im Bild)',
    open: (who) => `(offen, ${who})`,
  },
};

/** Title line of a picture: kind and title. */
export const imageTitle = (kind: string, title: string): string => `${kind} · ${title}`;
