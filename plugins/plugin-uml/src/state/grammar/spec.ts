import { localeAttribute } from '@diagrist/core';
import { attr, type Infer, kind, oneOf, text } from '@diagrist/lang';
import { adr } from '@diagrist/parts';
import { go, internal, stateNote } from './transitions.js';
import {
  choice,
  entrypoint,
  exitpoint,
  final,
  fork,
  history,
  initial,
  join,
  junction,
  region,
  stateStatement,
  terminate,
} from './vertices.js';

const statements = [
  stateStatement,
  initial,
  final,
  choice,
  junction,
  history,
  fork,
  join,
  terminate,
  entrypoint,
  exitpoint,
  region,
  go,
  internal,
  stateNote,
  adr,
] as const;

/** The statement tables of UML state machine diagrams. */
export const stateSpec = kind('state', {
  doc: 'A UML state machine diagram (UML 2.5.1, chapter 14): states and pseudostates joined by transitions, composite states with substates or orthogonal regions, entry and exit points on their border. `{protocol}` in the title makes it a protocol state machine. Diagrist lays it out by itself: layers by the longest path from the initial pseudostate, final states last, back and skip transitions on rails beside the states, loops at a free corner.',
  header: {
    subtitle: attr(text(), 'Second line below the title.'),
    look: attr(
      oneOf(['plain', 'cards']),
      '`plain` (default) draws the UML notation, `cards` the same layout with states as cards with a toned name field.',
    ),
    direction: attr(
      oneOf(['down', 'right']),
      '`down` (default) lays the flow out from top to bottom, `right` from left to right.',
    ),
    locale: localeAttribute,
  },
  statements,
});

/** Typed value of a statement, derived from the tables (ADR 0004). */
export type StateStatement = Infer<(typeof statements)[number]>;
