import { localeAttribute } from '@diagrist/core';
import { attr, type Infer, kind, oneOf, text } from '@diagrist/lang';
import { adr } from '../../shared/adr.js';
import { autonumber, divider, duration, frame, invariant, note, ref, time } from './annotations.js';
import { type and, coregion, FRAGMENTS, type otherwise } from './fragments.js';
import { activate, create, deactivate, destroy, msg } from './messages.js';
import { actor, boundary, control, database, entity, participant, queue } from './participants.js';

const statements = [
  participant,
  actor,
  database,
  queue,
  boundary,
  control,
  entity,
  autonumber,
  frame,
  msg,
  create,
  destroy,
  activate,
  deactivate,
  note,
  ref,
  invariant,
  divider,
  coregion,
  ...FRAGMENTS,
  duration,
  time,
  adr,
] as const;

/** The statement tables of UML sequence diagrams. */
export const sequenceSpec = kind('sequence', {
  doc: 'A UML sequence diagram (UML 2.5.1, chapter 17): lifelines from left to right in source order, messages and fragments from top to bottom. Fragments nest by indentation.',
  header: {
    subtitle: attr(text(), 'Second line below the title.'),
    look: attr(oneOf(['plain', 'cards']), '`plain` (default) draws the UML notation, `cards` toned cards.'),
    locale: localeAttribute,
  },
  statements,
});

/** Typed value of a top-level statement, derived from the tables (ADR 0004). */
export type SequenceStatement = Infer<(typeof statements)[number]>;

/** Typed value of an operand marker inside a fragment. */
export type OperandStatement = Infer<typeof otherwise | typeof and>;
