import type { Locale } from '@diagrist/lang';
import type { ElementKeyword } from '../grammar/elements.js';

/**
 * How the heads of column bands (`groups.form: band`) name the bands no frame names: people, the emphasized
 * element, and the neighbours with their count.
 */
export interface BandWords {
  readonly people: { readonly title: string; readonly subtitle: string };
  readonly focus: string;
  readonly neighbours: string;
  /** A count of elements of one keyword, or of mixed ones without it. */
  readonly count: (n: number, keyword?: ElementKeyword) => string;
}

const EN_NOUNS: Readonly<Record<ElementKeyword, readonly [string, string]>> = {
  person: ['person', 'people'],
  system: ['system', 'systems'],
  container: ['container', 'containers'],
  component: ['component', 'components'],
  node: ['element', 'elements'],
};

const DE_NOUNS: Readonly<Record<ElementKeyword, readonly [string, string]>> = {
  person: ['Person', 'Personen'],
  system: ['System', 'Systeme'],
  container: ['Container', 'Container'],
  component: ['Komponente', 'Komponenten'],
  node: ['Element', 'Elemente'],
};

const EN: BandWords = {
  people: { title: 'Users', subtitle: 'outside the system' },
  focus: 'in focus',
  neighbours: 'Neighbours',
  count: (n, k) => `${n} ${EN_NOUNS[k ?? 'node'][n === 1 ? 0 : 1]}`,
};

const DE: BandWords = {
  people: { title: 'Nutzer', subtitle: 'außerhalb des Systems' },
  focus: 'im Fokus',
  neighbours: 'Nachbarn',
  count: (n, k) => `${n} ${DE_NOUNS[k ?? 'node'][n === 1 ? 0 : 1]}`,
};

/** The words of band heads by locale. */
export const BAND_WORDS: Readonly<Record<Locale, BandWords>> = { en: EN, de: DE };
