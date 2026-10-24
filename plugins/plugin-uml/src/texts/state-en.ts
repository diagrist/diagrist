import { plural } from '../shared/words.js';
import type { Doings, StateProse } from '../state/describe/prose.js';

const NOUN = {
  state: 'state',
  initial: 'start',
  final: 'end',
  choice: 'choice',
  junction: 'junction',
  history: 'history',
  fork: 'fork',
  join: 'join',
  terminate: 'terminate',
  entrypoint: 'entry point',
  exitpoint: 'exit point',
  region: 'region',
} as const;

function doings(d: Doings): string {
  const internal = d.internals.map(
    (i) =>
      `internal ${[i.on, i.when ? `when ${i.when}` : '', i.do ? `effect ${i.do}` : ''].filter(Boolean).join(', ')}`,
  );
  const parts = [
    d.entry ? `on entry ${d.entry}` : '',
    d.do ? `meanwhile ${d.do}` : '',
    d.exit ? `on exit ${d.exit}` : '',
    d.defer.length ? `defers ${d.defer.join(', ')}` : '',
    ...internal,
  ].filter(Boolean);
  return parts.length ? ` (${parts.join('; ')})` : '';
}

/** English sentences of the state machine description. */
export const STATE_EN: StateProse = {
  summary: (title, kind, protocol, states, pseudo, regions, transitions) => {
    const parts = [
      plural(states, 'state', 'states'),
      plural(pseudo, 'pseudostate or final state', 'pseudostates and final states'),
      ...(regions ? [plural(regions, 'region', 'regions')] : []),
    ];
    return `${title}. ${kind}${protocol ? ', as a protocol state machine,' : ''} with ${parts.join(', ')} and ${plural(transitions, 'transition', 'transitions')}.`;
  },
  name: (n) => {
    const noun = n.kind === 'history' && n.deep ? 'deep history' : NOUN[n.kind];
    if (n.label) return `${noun} "${n.label}"`;
    if (n.parent) return `${noun} in ${n.parent}`;
    return n.id ? `${noun} ${n.id}` : noun;
  },
  doings,
  simple: (name, inside, d) => `State ${name}${inside ? ` in ${inside}` : ''}${d}.`,
  submachine: (name, inside, d, machine, file, rim) =>
    `Submachine state ${name}${inside ? ` in ${inside}` : ''}${d}, calls the state machine ${machine}${file ? ` in the file ${file}` : ''}${rim ? `; on its border ${rim}` : ''}.`,
  composite: (name, inside, d, kids, rim) =>
    `Composite state ${name}${inside ? ` in ${inside}` : ''}${d} with ${kids}${rim ? `; on its border ${rim}` : ''}.`,
  regions: (regions) =>
    `the ${regions.length} orthogonal regions ${regions.map((r) => `${r.name} (${r.kids})`).join(' and ')}, active at the same time`,
  transition: (o, target, into, self, when, effect, post) => {
    const to = self ? `back to ${target} (self transition)` : `to ${target}${into ? ` in ${into}` : ''}`;
    const guard = when === 'else' ? ', when no other condition holds' : when ? `, when ${when}` : '';
    const tail = `${to}${guard}${effect ? `, running ${effect}` : ''}${post ? `; afterwards ${post} holds` : ''}.`;
    switch (o.from) {
      case 'initial':
        return `The flow starts at ${o.source} and goes ${tail}`;
      case 'point':
        return `Through ${o.source} the flow ${o.exit ? 'leaves' : 'enters'} ${o.owner} and goes ${tail}`;
      case 'pseudo':
        return `From ${o.source} it goes ${tail}`;
      case 'time':
        return `In the state ${o.source} the time event "${o.event} passed" leads ${tail}`;
      case 'change':
        return `In the state ${o.source} the change event "as soon as ${o.event}" leads ${tail}`;
      case 'event':
        return `In the state ${o.source} ${o.call ? 'the call' : 'the event'} ${o.event} leads ${tail}`;
      case 'completion':
        return `When the state ${o.source} is done, it goes ${tail}`;
    }
  },
  note: (on, text) => `Note on ${on}: ${text}.`,
};
