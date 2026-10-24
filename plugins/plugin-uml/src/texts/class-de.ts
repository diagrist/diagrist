import type { ClassProse, RelationDetails } from '../class/describe/prose.js';
import type { RelationKind } from '../class/diagram.js';
import { plural } from '../shared/words.js';

const list = (items: readonly string[]) =>
  items.length < 2 ? (items[0] ?? 'keine Klasse') : `${items.slice(0, -1).join(', ')} und ${items.at(-1)}`;

const NOUN = { class: 'Klasse', interface: 'Schnittstelle', enum: 'Aufzählung' } as const;

const COUNT = {
  class: ['Klasse', 'Klassen'],
  interface: ['Schnittstelle', 'Schnittstellen'],
  enum: ['Aufzählung', 'Aufzählungen'],
  nary: ['n-äre Assoziation', 'n-äre Assoziationen'],
  package: ['Paket', 'Paketen'],
} as const;

function head(kind: RelationKind, a: string, b: string, keyword: string | undefined): string {
  return {
    generalization: `${a} ist eine Spezialisierung von ${b} (Generalisierung)`,
    realization: `${a} realisiert die Schnittstelle ${b}`,
    association: `${a} und ${b} sind assoziiert`,
    directed: `${a} kennt ${b} (gerichtete Assoziation)`,
    dependency: keyword
      ? `${a} importiert ${b}${keyword === 'access' ? ' privat' : ''} («${keyword}»)`
      : `${a} hängt von ${b} ab`,
    aggregation: `${a} aggregiert ${b} (Aggregation, ${a} ist das Ganze)`,
    composition: `${a} besteht aus ${b} (Komposition, ${b} existiert nur mit ${a})`,
    bidirectional: `${a} und ${b} kennen einander (in beide Richtungen navigierbar)`,
  }[kind];
}

function details(a: string, b: string, d: RelationDetails): string {
  const blind =
    d.nonav === 'both'
      ? `weder ${a} noch ${b} ist vom anderen Ende aus navigierbar`
      : d.nonav === 'to'
        ? `${b} ist von ${a} aus nicht navigierbar`
        : d.nonav === 'from'
          ? `${a} ist von ${b} aus nicht navigierbar`
          : '';
  const ends = [
    d.card ? `je ${a} ${d.card} ${b}` : '',
    d.source ? `je ${b} ${d.source} ${a}` : '',
    d.role ? `Rolle ${d.role} bei ${b}` : '',
    d.srole ? `Rolle ${d.srole} bei ${a}` : '',
  ].filter(Boolean);
  return [d.label ?? '', ends.join(', '), d.via ? `Assoziationsklasse ${d.via}` : '', blind].filter(Boolean).join('; ');
}

/** German sentences of the class description, as the predecessor wrote them. */
export const CLASS_DE: ClassProse = {
  summary: (title, kind, counts, n) =>
    `${title}. ${kind} mit ${[...counts, plural(n, 'Beziehung', 'Beziehungen')].join(', ').replace(/, (?=[^,]*$)/, ' und ')}.`,
  count: (kind, n) => (n ? plural(n, COUNT[kind][0], COUNT[kind][1]) : undefined),
  packageName: (label) => `Paket ${label}`,
  packageLine: (label, parent, parts) =>
    `Paket ${label}${parent ? ` in ${parent}` : ''}: enthält ${parts.join(', ') || 'nichts'}.`,
  classifier: (kind, abstract, label, extras, attributes, operations) => {
    const noun = abstract ? `Abstrakte ${NOUN[kind]}` : NOUN[kind];
    const more = `${extras.stereotype ? ` «${extras.stereotype}»` : ''}${extras.template ? ` mit Template-Parameter ${extras.template}` : ''}`;
    if (kind === 'enum') return `${noun} ${label}${more}: Werte ${attributes.join(', ') || 'keine'}.`;
    const parts = [
      attributes.length ? `Attribute ${attributes.join(', ')}` : '',
      operations.length ? `Operationen ${operations.join(', ')}` : '',
    ].filter(Boolean);
    return `${noun} ${label}${more}${parts.length ? `: ${parts.join('; ')}` : ' ohne Mitglieder'}.`;
  },
  member: (text, abstract, isStatic) => {
    const traits = [abstract ? 'abstrakt' : '', isStatic ? 'statisch' : ''].filter(Boolean);
    return `${text}${traits.length ? ` (${traits.join(', ')})` : ''}`;
  },
  relation: (kind, a, b, keyword, d) => {
    const more = details(a, b, d);
    return `${head(kind, a, b, keyword)}${more ? `: ${more}` : ''}.`;
  },
  nary: (label, ends, via) => {
    const text = ends.map((e) => {
      const extra = [e.count ?? '', e.role ? `Rolle ${e.role}` : '', e.navigable ? 'navigierbar' : ''].filter(Boolean);
      return `${e.name}${extra.length ? ` (${extra.join(', ')})` : ''}`;
    });
    const name = label ? `N-äre Assoziation ${label}` : 'N-äre Assoziation ohne Namen';
    return `${name} verbindet ${list(text)}${via ? `; Assoziationsklasse ${via}` : ''}.`;
  },
  note: (on, text) => `Notiz an ${on}: ${text}.`,
};
