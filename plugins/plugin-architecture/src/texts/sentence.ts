import type { Locale } from '@diagrist/lang';
import type { EdgeKind } from '../grammar/edges.js';
import type { Change } from '../layout/diff.js';
import type { NodeShape, NodeStatus, Role } from '../model/types.js';

/**
 * How the sentence legend (`legend: sentence`) names what the picture shows, before the colon that explains it. The
 * meanings come from the plugin's `Texts`, so both legends say the same.
 */
export interface SentenceWords {
  readonly edges: Readonly<Record<EdgeKind, string>>;
  readonly roles: Readonly<Record<Role, string>>;
  readonly status: Readonly<Record<NodeStatus, string>>;
  readonly shapes: Readonly<Record<NodeShape, string>>;
  /** How a diff picture shows each change (ADR 0021). */
  readonly changes: Readonly<Record<Change, string>>;
  readonly emph: string;
  readonly replicas: string;
  readonly icon: string;
  /** A flow by its id and step numbers; `bold` when it is drawn as the focus. */
  readonly flow: (id: string, from: number, to: number, bold: boolean) => string;
  readonly mark: string;
  /** The mark when the decisions stand below the picture. */
  readonly markBelow: string;
  /** What the context of `focus: dim` looks like and means. */
  readonly context: string;
}

const EN: SentenceWords = {
  edges: {
    sync: 'Solid line',
    async: 'Dashed',
    dependency: 'Dashed',
    data: 'Heavy line',
    link: 'Line without head',
    duplex: 'Heads at both ends',
  },
  roles: { own: 'Grey area', shared: 'Fine frame', external: 'Fine frame' },
  status: { planned: 'Green dot', deprecated: 'Red dot' },
  shapes: { db: 'Cylinder', queue: 'Double left edge', store: 'Folded corner', job: 'Clock', app: 'Window bar' },
  changes: { added: 'Heavy outline and +', removed: 'Dotted and ×', changed: '~' },
  emph: 'Yellow',
  replicas: 'x3',
  icon: 'Icons: technology or role of the element',
  flow: (id, from, to, bold) =>
    `${from === to ? `Step ${from}` : `Steps ${from} to ${to}`}${bold ? ', drawn darker' : ''}: flow ${id}`,
  mark: 'E1: decision in the margin',
  markBelow: 'E1: decision below the picture',
  context: 'Grey: in no flow',
};

const DE: SentenceWords = {
  edges: {
    sync: 'Durchgezogen',
    async: 'Gestrichelt',
    dependency: 'Gestrichelt',
    data: 'Kräftige Linie',
    link: 'Linie ohne Spitze',
    duplex: 'Spitzen an beiden Enden',
  },
  roles: { own: 'Graue Fläche', shared: 'Feiner Rahmen', external: 'Feiner Rahmen' },
  status: { planned: 'Grüner Punkt', deprecated: 'Roter Punkt' },
  shapes: { db: 'Zylinder', queue: 'Doppelte Kante links', store: 'Eselsohr', job: 'Uhr', app: 'Fensterleiste' },
  changes: { added: 'Kräftiger Rand und +', removed: 'Gepunktet und ×', changed: '~' },
  emph: 'Gelb',
  replicas: 'x3',
  icon: 'Symbole: Technologie oder Rolle des Elements',
  flow: (id, from, to, bold) =>
    `${from === to ? `Schritt ${from}` : `Schritte ${from} bis ${to}`}${bold ? ', dunkler gezeichnet' : ''}: Flow ${id}`,
  mark: 'E1: Entscheidung am Rand',
  markBelow: 'E1: Entscheidung unter dem Bild',
  context: 'Grau: in keinem Flow',
};

/** The words of the sentence legend by locale; the type makes a missing locale a compile error. */
export const SENTENCE_WORDS: Readonly<Record<Locale, SentenceWords>> = { en: EN, de: DE };
