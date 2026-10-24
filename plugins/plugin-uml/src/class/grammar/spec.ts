import { localeAttribute } from '@diagrist/core';
import { attr, type Infer, kind, oneOf, text } from '@diagrist/lang';
import { adr } from '@diagrist/parts';
import {
  assocStatement,
  classNote,
  classStatement,
  enumStatement,
  interfaceStatement,
  packageStatement,
} from './classifiers.js';
import { classRel } from './relation.js';

const statements = [
  classStatement,
  interfaceStatement,
  enumStatement,
  packageStatement,
  assocStatement,
  classRel,
  classNote,
  adr,
] as const;

/** The statement tables of UML class diagrams. */
export const classSpec = kind('class', {
  doc: 'A UML class diagram (UML 2.5.1, chapters 9 to 12): classes, interfaces and enumerations with their members, packages, and the relations between them. Diagrist lays it out by itself in layers: superclasses, interfaces, wholes and users above, associated classes side by side, each package as one block.',
  header: {
    subtitle: attr(text(), 'Second line below the title.'),
    look: attr(
      oneOf(['plain', 'cards']),
      '`plain` (default) draws the UML notation, `cards` the same layout as cards with a toned name field and toned packages.',
    ),
    locale: localeAttribute,
  },
  statements,
});

/** Typed value of a statement, derived from the tables (ADR 0004). */
export type ClassStatement = Infer<(typeof statements)[number]>;
