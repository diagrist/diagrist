import { plural } from '../../shared/words.js';
import type { Doings, StateProse } from './prose.js';

const NOUN = {
  state: 'Zustand',
  initial: 'Start',
  final: 'Ende',
  choice: 'Entscheidung',
  junction: 'Verbindungspunkt',
  history: 'Historie',
  fork: 'Gabelung',
  join: 'Vereinigung',
  terminate: 'Abbruch',
  entrypoint: 'Eintrittspunkt',
  exitpoint: 'Austrittspunkt',
  region: 'Region',
} as const;

function doings(d: Doings): string {
  const internal = d.internals.map(
    (i) => `intern ${[i.on, i.when ? `wenn ${i.when}` : '', i.do ? `Effekt ${i.do}` : ''].filter(Boolean).join(', ')}`,
  );
  const parts = [
    d.entry ? `beim Eintritt ${d.entry}` : '',
    d.do ? `währenddessen ${d.do}` : '',
    d.exit ? `beim Austritt ${d.exit}` : '',
    d.defer.length ? `stellt ${d.defer.join(', ')} zurück` : '',
    ...internal,
  ].filter(Boolean);
  return parts.length ? ` (${parts.join('; ')})` : '';
}

/** German sentences of the state machine description, as the predecessor wrote them. */
export const STATE_DE: StateProse = {
  summary: (title, kind, protocol, states, pseudo, regions, transitions) => {
    const parts = [
      plural(states, 'Zustand', 'Zuständen'),
      plural(pseudo, 'Pseudo- oder Endzustand', 'Pseudo- und Endzuständen'),
      ...(regions ? [plural(regions, 'Region', 'Regionen')] : []),
    ];
    return `${title}. ${kind}${protocol ? ', als Protokoll-Zustandsautomat,' : ''} mit ${parts.join(', ')} und ${plural(transitions, 'Transition', 'Transitionen')}.`;
  },
  name: (n) => {
    const noun = n.kind === 'history' && n.deep ? 'tiefe Historie' : NOUN[n.kind];
    if (n.label) return `${noun} „${n.label}“`;
    if (n.parent) return `${noun} in ${n.parent}`;
    return n.id ? `${noun} ${n.id}` : noun;
  },
  doings,
  simple: (name, inside, d) => `Zustand ${name}${inside ? ` in ${inside}` : ''}${d}.`,
  submachine: (name, inside, d, machine, file, rim) =>
    `Unterautomaten-Zustand ${name}${inside ? ` in ${inside}` : ''}${d}, ruft den Zustandsautomaten ${machine}${file ? ` aus der Datei ${file}` : ''} auf${rim ? `; auf dem Rand ${rim}` : ''}.`,
  composite: (name, inside, d, kids, rim) =>
    `Zusammengesetzter Zustand ${name}${inside ? ` in ${inside}` : ''}${d} mit ${kids}${rim ? `; auf dem Rand ${rim}` : ''}.`,
  regions: (regions) =>
    `den ${regions.length} orthogonalen Regionen ${regions.map((r) => `${r.name} (${r.kids})`).join(' und ')}, die gleichzeitig aktiv sind`,
  transition: (o, target, into, self, when, effect, post) => {
    const to = self ? `zurück nach ${target} (Selbsttransition)` : `nach ${target}${into ? ` in ${into}` : ''}`;
    const guard = when === 'else' ? ', wenn keine andere Bedingung gilt' : when ? `, wenn ${when}` : '';
    const tail = `${to}${guard}${effect ? `; dabei wird ${effect} ausgeführt` : ''}${post ? `; danach gilt ${post}` : ''}.`;
    switch (o.from) {
      case 'initial':
        return `Der Ablauf beginnt bei ${o.source} und geht ${tail}`;
      case 'point':
        return `Über ${o.source} ${o.exit ? 'verlässt' : 'betritt'} der Ablauf ${o.owner} und geht ${tail}`;
      case 'pseudo':
        return `Von ${o.source} geht es ${tail}`;
      case 'time':
        return `Im Zustand ${o.source} führt das Zeitereignis „${o.event} abgelaufen“ ${tail}`;
      case 'change':
        return `Im Zustand ${o.source} führt das Änderungsereignis „sobald ${o.event}“ ${tail}`;
      case 'event':
        return `Im Zustand ${o.source} führt ${o.call ? 'der Aufruf' : 'das Ereignis'} ${o.event} ${tail}`;
      case 'completion':
        return `Ist der Zustand ${o.source} abgeschlossen, geht es ${tail}`;
    }
  },
  note: (on, text) => `Notiz an ${on}: ${text}.`,
};
