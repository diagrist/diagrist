import type { Locale } from '@diagrist/lang';
import type { Decision } from './decisions/adr.js';

/**
 * What the shared parts write in words, in one locale (ADR 0008 Nr. 3): the texts they add to the picture and
 * their sentences in the description. Words of a kind, such as its name, stay in its plugin.
 */
export interface Words {
  /** Heading of the decision bar. */
  readonly decisions: string;
  /** Suffix of the question of an open decision, naming who still decides. */
  readonly open: (who: string) => string;
  /** A decision in the description, one sentence per `adr`. */
  readonly decision: (decision: Decision) => string;
}

const EN: Words = {
  decisions: 'Decisions (marks in the picture)',
  open: (who) => `(open, ${who})`,
  decision: (d) =>
    `${d.id} ${d.question} Chosen: ${d.choice}.${d.consequence ? ` ${d.consequence}` : ''}${d.open ? ` Open: ${d.open}.` : ''}`,
};

const DE: Words = {
  decisions: 'Entscheidungen (Marken im Bild)',
  open: (who) => `(offen, ${who})`,
  decision: (d) =>
    `${d.id} ${d.question} Gewählt: ${d.choice}.${d.consequence ? ` ${d.consequence}` : ''}${d.open ? ` Offen: ${d.open}.` : ''}`,
};

/** The words of the shared parts by locale; the type makes a missing locale a compile error. */
export const WORDS: Readonly<Record<Locale, Words>> = { en: EN, de: DE };

/** Title line of a picture: the kind's name and the title, as in `Sequence diagram (UML) · Login`. */
export const imageTitle = (kind: string, title: string): string => `${kind} · ${title}`;
