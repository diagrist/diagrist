import { type GatePlace, plural } from '../sequence/describe/prose.js';
import type { Texts } from './index.js';

const which = (p: GatePlace) => (p.name ? `the gate "${p.name}"` : 'a gate');

/** English texts. */
export const EN: Texts = {
  picture: {
    sequence: 'Sequence diagram (UML)',
    decisions: 'Decisions (marks in the picture)',
    open: (who) => `(open, ${who})`,
  },
  sequence: {
    summary: (title, kind, p, m) =>
      `${title}. ${kind} with ${plural(p, 'participant', 'participants')} and ${plural(m, 'message', 'messages')}.`,
    lineup: (list) => `Participants from left to right: ${list}.`,
    noun: {
      participant: '',
      actor: 'actor',
      database: 'database',
      queue: 'queue',
      boundary: 'boundary',
      control: 'control',
      entity: 'entity',
    },
    external: 'external',
    numbered: 'The messages carry their number in the picture.',
    framed: (name) => `A frame "sd ${name}" encloses the interaction.`,
    opening: {
      alt: ['Alternative', 'Otherwise'],
      opt: ['Optional', ''],
      loop: ['Repetition', ''],
      par: ['Parallel', 'At the same time'],
      break: ['Break', ''],
      critical: ['Critical region', ''],
      seq: ['Weak sequencing', 'Then'],
      strict: ['Strict sequencing', 'Strictly then'],
      neg: ['Invalid trace', ''],
      assert: ['Asserted', ''],
      ignore: ['Ignored', ''],
      consider: ['Considered only', ''],
    },
    plain: (kind, n, a, b, text) =>
      ({
        create: `${n}. ${a} creates ${b}${text}.`,
        reply: `${n}. ${a} replies to ${b}${text}.`,
        self: `${n}. ${a} calls itself${text}.`,
        async: `${n}. ${a} sends asynchronously to ${b}${text}.`,
        sync: `${n}. ${a} calls ${b}${text}.`,
      })[kind],
    selfReply: (n, a, text) => `${n}. ${a} replies to itself${text}.`,
    lost: (n, a, call, text) => `${n}. ${a} sends a lost ${call ? 'call' : 'message'}${text}.`,
    found: (n, b, call, text) => `${n}. ${b} receives a found ${call ? 'call' : 'message'}${text}.`,
    gate: (p) =>
      p.at === 'ref'
        ? `through ${which(p)} of the reference "${p.label}"`
        : p.at === 'fragment'
          ? `through ${which(p)} on the frame of ${p.operator}`
          : `through ${which(p)} on the frame`,
    gateIn: (kind, n, b, gate, outside, text) => {
      const away = outside ? ' from outside' : '';
      if (kind === 'reply') return `${n}. ${b} gets the reply${away} ${gate}${text}.`;
      return kind === 'sync'
        ? `${n}. ${b} is called${away} ${gate}${text}.`
        : `${n}. ${b} receives a message${away} ${gate}${text}.`;
    },
    gateOut: (kind, n, a, gate, outside, text) => {
      const verb = { reply: 'replies', sync: 'calls', async: 'sends', create: 'sends' }[kind];
      return `${n}. ${a} ${verb}${outside ? ' to the outside' : ''} ${gate}${text}.`;
    },
    extras: (duration, mark) => [duration ? `duration {${duration}}` : '', mark ? `decision ${mark}` : ''],
    coregion: (name) => `In any order on ${name} (coregion):`,
    divider: (label) => `Section${label ? ` "${label}"` : ''}:`,
    destroy: (name) => `${name} is destroyed.`,
    ref: (label, file, over) =>
      `Reference to the interaction "${label}"${file ? ` in the file ${file}` : ''} over ${over}.`,
    note: (over, text) => `Note over ${over}: ${text}`,
    activate: (name) => `${name} becomes active.`,
    deactivate: (name) => `${name} is done.`,
    invariant: (name, text, state) =>
      state ? `${name} is in the state "${text}".` : `Invariant on ${name}: {${text}}.`,
    message: (n) => `message ${n}`,
    duration: (from, to, text) => `Time constraint from ${from} to ${to}: {${text}}.`,
    time: (at, text) => `Time constraint at ${at}: {${text}}.`,
    decision: (id, question, choice, consequence, open) =>
      `${id} ${question} Chosen: ${choice}.${consequence ? ` ${consequence}` : ''}${open ? ` Open: ${open}.` : ''}`,
  },
};
