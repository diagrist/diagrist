import type { ActivityProse } from '../activity/describe/prose.js';

const list = (items: readonly string[]) =>
  items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const quote = (text: string) => `"${text}"`;

/** How the elements run by mode (UML 2.5.1, 16.12.3). */
const MODE = {
  iterative: 'one element after the other',
  parallel: 'for all elements at the same time',
  stream: 'as a stream over all elements',
} as const;

const NAMED = {
  send: 'Send signal',
  accept: 'Accept event',
  wait: 'Time event',
  datastore: 'Data store',
  buffer: 'Buffer',
} as const;

/** English sentences of the activity description. */
export const ACTIVITY_EN: ActivityProse = {
  summary: (title, kind, nodes, flows, lanes) =>
    `${title}. ${kind} with ${count(nodes, 'node', 'nodes')} and ${count(flows, 'edge', 'edges')}${lanes ? ` in ${count(lanes, 'lane', 'lanes')}` : ''}.`,
  noun: {
    initial: 'Start',
    final: 'Activity final',
    flowfinal: 'Flow final',
    decision: 'Decision',
    merge: 'Merge',
    fork: 'Fork',
    join: 'Join',
  },
  named: (kind, label) => `${NAMED[kind]} ${quote(label)}`,
  object: (label, state) => `Object ${label}${state ? ` [${state}]` : ''}`,
  port: (side, name, region) => `${side === 'in' ? 'Input' : 'Output'}${name ? ` ${quote(name)}` : ''} of ${region}`,
  quote,
  lane: (label, members) => `Lane ${label}: ${members.length ? members.join(', ') : 'empty'}.`,
  region: (name, members) => `Interruptible region ${name}: ${members.length ? list(members) : 'empty'}.`,
  expansion: (name, mode, collections, members) =>
    `Expansion region ${name} «${mode}» runs ${MODE[mode]} of the ${collections.length > 1 ? `collections ${list(collections.map(quote))}` : 'collection'}: ${members.length ? list(members) : 'empty'}.`,
  call: (name) => `${name} is a call behavior action and calls an activity of its own.`,
  pins: (name, inputs, outputs) => {
    const named = (kind: string, names: readonly string[]) =>
      names.length ? [`${kind} pin${names.length > 1 ? 's' : ''} ${list(names.map(quote))}`] : [];
    const own = [...named('input', inputs), ...named('output', outputs)];
    return `${name} has ${own.some((x) => x.includes(' and ')) ? own.join(' as well as ') : list(own)}.`;
  },
  handler: (p, exception, h) =>
    `If ${p} throws the exception ${quote(exception)}, ${h} takes over; then the flow goes on as after ${p}.`,
  decision: (name, alternatives) =>
    `${name}: ${alternatives.map((a) => `${a.else ? 'otherwise' : a.guard ? `if [${a.guard}], then` : 'without condition'} ${a.to}`).join('; ')}.`,
  fork: (name, to) => `${name}: at the same time ${list(to)}.`,
  join: (name, from, to) => `${name} waits for ${list(from)}, then ${list(to)}.`,
  merge: (name, from, to) => `${name} from ${list(from)}, on to ${list(to)}.`,
  flow: (from, object, to, pins, weight, guard) => {
    const heavy = weight === undefined ? '' : ` with weight ${weight}`;
    const pin = pins.from ?? pins.to;
    const via =
      pins.from && pins.to && pins.from !== pins.to
        ? ` from pin ${quote(pins.from)} to pin ${quote(pins.to)}${heavy}`
        : `${pin ? ` through pin ${quote(pin)}` : ''}${heavy}`;
    return `${from} ${object ? '⇒' : '→'} ${to}${via}${guard ? ` [${guard}]` : ''}.`;
  },
  interrupt: (name, region, to) => `${name} interrupts the region ${region}, on to ${to}.`,
};
