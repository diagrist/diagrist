import type { ActivityProse } from './prose.js';

const list = (items: readonly string[]) =>
  items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} und ${items.at(-1)}`;

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const quote = (text: string) => `„${text}“`;

/** How the elements run by mode, in German (UML 2.5.1, 16.12.3). */
const MODE = {
  iterative: 'nacheinander für jedes Element',
  parallel: 'gleichzeitig für alle Elemente',
  stream: 'als Strom über alle Elemente',
} as const;

const NAMED = {
  send: 'Signal senden',
  accept: 'Signal empfangen',
  wait: 'Zeitereignis',
  datastore: 'Datenspeicher',
  buffer: 'Puffer',
} as const;

/** German sentences of the activity description, as the predecessor wrote them. */
export const ACTIVITY_DE: ActivityProse = {
  summary: (title, kind, nodes, flows, lanes) =>
    `${title}. ${kind} mit ${count(nodes, 'Knoten', 'Knoten')} und ${count(flows, 'Kante', 'Kanten')}${lanes ? ` in ${count(lanes, 'Bahn', 'Bahnen')}` : ''}.`,
  noun: {
    initial: 'Start',
    final: 'Aktivitätsende',
    flowfinal: 'Flussende',
    decision: 'Entscheidung',
    merge: 'Zusammenführung',
    fork: 'Gabelung',
    join: 'Vereinigung',
  },
  named: (kind, label) => `${NAMED[kind]} ${quote(label)}`,
  object: (label, state) => `Objekt ${label}${state ? ` [${state}]` : ''}`,
  port: (side, name, region) =>
    `${side === 'in' ? 'Eingang' : 'Ausgang'}${name ? ` ${quote(name)}` : ''} von ${region}`,
  quote,
  lane: (label, members) => `Bahn ${label}: ${members.length ? members.join(', ') : 'leer'}.`,
  region: (name, members) => `Unterbrechungsbereich ${name}: ${members.length ? list(members) : 'leer'}.`,
  expansion: (name, mode, collections, members) =>
    `Expansionsbereich ${name} «${mode}» läuft ${MODE[mode]} der ${collections.length > 1 ? `Sammlungen ${list(collections.map(quote))}` : 'Sammlung'}: ${members.length ? list(members) : 'leer'}.`,
  call: (name) => `${name} ist eine Aufruf-Aktion und ruft eine eigene Aktivität auf.`,
  pins: (name, inputs, outputs) => {
    const named = (kind: string, names: readonly string[]) =>
      names.length ? [`${kind}-Pin${names.length > 1 ? 's' : ''} ${list(names.map(quote))}`] : [];
    const own = [...named('Eingabe', inputs), ...named('Ausgabe', outputs)];
    return `${name} hat ${own.some((x) => x.includes(' und ')) ? own.join(' sowie ') : list(own)}.`;
  },
  handler: (p, exception, h) =>
    `Wirft ${p} die Ausnahme ${quote(exception)}, übernimmt ${h}; danach geht es wie nach ${p} weiter.`,
  decision: (name, alternatives) =>
    `${name}: ${alternatives.map((a) => `${a.else ? 'sonst' : a.guard ? `wenn [${a.guard}], dann` : 'ohne Bedingung'} ${a.to}`).join('; ')}.`,
  fork: (name, to) => `${name}: gleichzeitig ${list(to)}.`,
  join: (name, from, to) => `${name} wartet auf ${list(from)}, dann ${list(to)}.`,
  merge: (name, from, to) => `${name} von ${list(from)}, weiter zu ${list(to)}.`,
  flow: (from, object, to, pins, weight, guard) => {
    const heavy = weight === undefined ? '' : ` mit Gewicht ${weight}`;
    const pin = pins.from ?? pins.to;
    const via =
      pins.from && pins.to && pins.from !== pins.to
        ? ` von Pin ${quote(pins.from)} zu Pin ${quote(pins.to)}${heavy}`
        : `${pin ? ` über Pin ${quote(pin)}` : ''}${heavy}`;
    return `${from} ${object ? '⇒' : '→'} ${to}${via}${guard ? ` [${guard}]` : ''}.`;
  },
  interrupt: (name, region, to) => `${name} unterbricht den Bereich ${region}, weiter zu ${to}.`,
};
