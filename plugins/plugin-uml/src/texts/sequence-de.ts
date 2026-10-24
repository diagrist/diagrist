import type { GatePlace, SequenceProse } from '../sequence/describe/prose.js';
import { plural } from '../shared/words.js';

const which = (p: GatePlace) => (p.name ? `das Gate „${p.name}“` : 'ein Gate');

/** German sentences of the sequence description, as the predecessor wrote them. */
export const SEQUENCE_DE: SequenceProse = {
  summary: (title, kind, p, m) =>
    `${title}. ${kind} mit ${plural(p, 'Teilnehmer', 'Teilnehmern')} und ${plural(m, 'Nachricht', 'Nachrichten')}.`,
  lineup: (list) => `Teilnehmer von links nach rechts: ${list}.`,
  noun: {
    participant: '',
    actor: 'Akteur',
    database: 'Datenbank',
    queue: 'Warteschlange',
    boundary: 'Boundary',
    control: 'Control',
    entity: 'Entity',
  },
  external: 'extern',
  numbered: 'Die Nachrichten tragen im Bild ihre Nummer.',
  framed: (name) => `Ein Rahmen „sd ${name}“ umschließt die Interaktion.`,
  opening: {
    alt: ['Alternative', 'Sonst'],
    opt: ['Optional', ''],
    loop: ['Wiederholung', ''],
    par: ['Parallel', 'Gleichzeitig'],
    break: ['Abbruch', ''],
    critical: ['Kritischer Bereich', ''],
    seq: ['Schwache Reihenfolge', 'Danach'],
    strict: ['Strenge Reihenfolge', 'Streng danach'],
    neg: ['Ungültige Folge', ''],
    assert: ['Zugesichert', ''],
    ignore: ['Ignoriert', ''],
    consider: ['Nur betrachtet', ''],
  },
  plain: (kind, n, a, b, text) =>
    ({
      create: `${n}. ${a} erzeugt ${b}${text}.`,
      reply: `${n}. ${a} antwortet ${b}${text}.`,
      self: `${n}. ${a} ruft sich selbst auf${text}.`,
      async: `${n}. ${a} sendet asynchron an ${b}${text}.`,
      sync: `${n}. ${a} ruft ${b} auf${text}.`,
    })[kind],
  selfReply: (n, a, text) => `${n}. ${a} antwortet sich selbst${text}.`,
  lost: (n, a, call, text) =>
    `${n}. ${a} sendet ${call ? 'einen verlorenen Aufruf' : 'eine verlorene Nachricht'}${text}.`,
  found: (n, b, call, text) =>
    `${n}. ${b} empfängt ${call ? 'einen gefundenen Aufruf' : 'eine gefundene Nachricht'}${text}.`,
  gate: (p) =>
    p.at === 'ref'
      ? `über ${which(p)} am Verweis „${p.label}“`
      : p.at === 'fragment'
        ? `über ${which(p)} am Rahmen von ${p.operator}`
        : `über ${which(p)} am Rahmen`,
  gateIn: (kind, n, b, gate, outside, text) => {
    const away = outside ? ' von außen' : '';
    if (kind === 'reply') return `${n}. ${b} erhält ${gate} die Antwort${away}${text}.`;
    return kind === 'sync'
      ? `${n}. ${b} wird ${gate}${away} aufgerufen${text}.`
      : `${n}. ${b} empfängt ${gate} eine Nachricht${away}${text}.`;
  },
  gateOut: (kind, n, a, gate, outside, text) => {
    const verb = { reply: 'antwortet', sync: 'ruft', async: 'sendet', create: 'sendet' }[kind];
    return `${n}. ${a} ${verb} ${gate}${outside ? ' nach außen' : ''}${kind === 'sync' ? ' auf' : ''}${text}.`;
  },
  extras: (duration, mark) => [duration ? `Dauer {${duration}}` : '', mark ? `Entscheidung ${mark}` : ''],
  coregion: (name) => `In beliebiger Reihenfolge auf ${name} (Coregion):`,
  divider: (label) => `Abschnitt${label ? ` „${label}“` : ''}:`,
  destroy: (name) => `${name} wird zerstört.`,
  ref: (label, file, over) =>
    `Verweis auf die Interaktion „${label}“${file ? ` aus der Datei ${file}` : ''} über ${over}.`,
  note: (over, text) => `Notiz über ${over}: ${text}`,
  activate: (name) => `${name} wird aktiv.`,
  deactivate: (name) => `${name} ist fertig.`,
  invariant: (name, text, state) =>
    state ? `${name} ist im Zustand „${text}“.` : `Invariante auf ${name}: {${text}}.`,
  message: (n) => `Nachricht ${n}`,
  duration: (from, to, text) => `Zeitbedingung von ${from} bis ${to}: {${text}}.`,
  time: (at, text) => `Zeitbedingung an ${at}: {${text}}.`,
};
