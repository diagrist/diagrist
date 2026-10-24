import { localeAttribute } from '@diagrist/core';
import { attr, type Infer, kind, oneOf, text } from '@diagrist/lang';
import { adr } from '@diagrist/parts';
import { accept, action, buffer, datastore, object, send, wait } from './actions.js';
import { decision, final, flowfinal, fork, initial, join, merge } from './control.js';
import { go, handler } from './flows.js';
import { expansion, interruptible, partition } from './frames.js';

const statements = [
  partition,
  interruptible,
  expansion,
  initial,
  final,
  flowfinal,
  action,
  decision,
  merge,
  fork,
  join,
  object,
  datastore,
  buffer,
  send,
  accept,
  wait,
  go,
  handler,
  adr,
] as const;

/** The statement tables of UML activity diagrams. */
export const activitySpec = kind('activity', {
  doc: 'A UML activity diagram (UML 2.5.1, chapters 15 and 16): nodes and edges in layers from top to bottom, one vertical swimlane per `partition`. Diagrist lays it out by itself: layers by the longest path, alternatives symmetric below their decision, parallel branches side by side below their fork, a hand-over into another lane level and horizontal when its line is free, loops back up on the right.',
  header: {
    subtitle: attr(text(), 'Second line below the title.'),
    look: attr(
      oneOf(['plain', 'cards']),
      '`plain` (default) draws the UML notation, `cards` the same layout with actions, objects and signals as cards and toned lane heads; start, ends, diamonds, bars and hourglass stay UML symbols.',
    ),
    locale: localeAttribute,
  },
  statements,
});

/** Typed value of a statement, derived from the tables (ADR 0004). */
export type ActivityStatement = Infer<(typeof statements)[number]>;
