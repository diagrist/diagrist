import type { Locale } from '@diagrist/lang';
import type { EdgeKind } from '../../grammar/edges.js';
import type { ElementKeyword } from '../../grammar/elements.js';
import type { NodeStatus } from '../../model/types.js';

/**
 * What `look=columns` writes in words: the heads of bands it names itself, the heads of the side column, and in
 * the footer what is seen, before the meaning that the plugin's `Texts` give.
 */
export interface ColumnsWords {
  readonly people: { readonly title: string; readonly subtitle: string };
  readonly focus: string;
  readonly neighbours: string;
  /** A count of elements of one keyword, or of mixed ones without it. */
  readonly count: (n: number, keyword?: ElementKeyword) => string;
  readonly steps: string;
  readonly stepCount: (n: number) => string;
  readonly decisions: string;
  readonly decisionCount: (n: number, open: number) => string;
  readonly edges: Readonly<Record<EdgeKind, string>>;
  readonly context: readonly [string, string];
  readonly emph: string;
  readonly status: Readonly<Record<NodeStatus, string>>;
  readonly replicas: string;
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

const EN: ColumnsWords = {
  people: { title: 'Users', subtitle: 'outside the system' },
  focus: 'in focus',
  neighbours: 'Neighbours',
  count: (n, k) => `${n} ${EN_NOUNS[k ?? 'node'][n === 1 ? 0 : 1]}`,
  steps: 'Flow',
  stepCount: (n) => `${n} steps`,
  decisions: 'Decisions',
  decisionCount: (n, open) => `${n} ${n === 1 ? 'decision' : 'decisions'}${open ? `, ${open} open` : ''}`,
  edges: {
    sync: 'Solid',
    async: 'Dashed',
    dependency: 'Dashed',
    data: 'Heavy',
    link: 'Without head',
    duplex: 'Heads at both ends',
  },
  context: ['Grey', 'not in focus'],
  emph: 'Blue frame',
  status: { planned: 'Green', deprecated: 'Red' },
  replicas: 'Double frame',
};

const DE: ColumnsWords = {
  people: { title: 'Nutzer', subtitle: 'außerhalb des Systems' },
  focus: 'im Fokus',
  neighbours: 'Nachbarn',
  count: (n, k) => `${n} ${DE_NOUNS[k ?? 'node'][n === 1 ? 0 : 1]}`,
  steps: 'Ablauf',
  stepCount: (n) => `${n} Schritte`,
  decisions: 'Entscheidungen',
  decisionCount: (n, open) => `${n} ${n === 1 ? 'Entscheidung' : 'Entscheidungen'}${open ? `, ${open} offen` : ''}`,
  edges: {
    sync: 'Durchgezogen',
    async: 'Gestrichelt',
    dependency: 'Gestrichelt',
    data: 'Kräftig',
    link: 'Ohne Spitze',
    duplex: 'Spitzen an beiden Enden',
  },
  context: ['Grau', 'nicht im Fokus'],
  emph: 'Blauer Rahmen',
  status: { planned: 'Grün', deprecated: 'Rot' },
  replicas: 'Doppelter Rahmen',
};

/** The words of `look=columns` by locale. */
export const COLUMNS_WORDS: Readonly<Record<Locale, ColumnsWords>> = { en: EN, de: DE };
