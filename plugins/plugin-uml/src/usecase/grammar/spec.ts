import { localeAttribute } from '@diagrist/core';
import { attr, type Infer, kind, oneOf, text } from '@diagrist/lang';
import { adr } from '@diagrist/parts';
import { actor, note, subject, usecase } from './elements.js';
import { rel } from './relation.js';

const statements = [actor, subject, usecase, rel, note, adr] as const;

/** The statement tables of UML use case diagrams. */
export const usecaseSpec = kind('usecase', {
  doc: 'A UML use case diagram (UML 2.5.1, chapter 18): actors outside, use cases inside their subject, relations as straight lines. Diagrist lays it out by itself: use cases in columns by include and extend, actors left or right at the height of their use cases, an order with as few crossings as it finds.',
  header: {
    subtitle: attr(text(), 'Second line below the title.'),
    look: attr(
      oneOf(['plain', 'cards']),
      '`plain` (default) draws the UML notation, `cards` the same layout with toned outlines and areas.',
    ),
    direction: attr(
      oneOf(['down', 'right']),
      'Several subjects: `right` side by side, `down` one below the other. Without it they stand below each other, unless an actor works in more than one or the picture would grow too tall; then side by side, more than three in rows of a grid, if that crosses no more lines. With fewer than two subjects it has no effect.',
    ),
    locale: localeAttribute,
  },
  statements,
});

/** Typed value of a statement, derived from the tables (ADR 0004). */
export type UseCaseStatement = Infer<(typeof statements)[number]>;
