import type { Catalog } from './catalog.js';

/**
 * The elements of UML 2.5.1 a use case diagram can show: chapter 18 (Use Cases), plus the generalization from
 * chapter 9 and the comment from chapter 7 that use case diagrams draw. Sections are the deepest heading of the
 * specification that defines the element, 18.1.4 for the alternative notations; titles are Diagrist's own words.
 */
export const USE_CASES = {
  useCase: { section: '18.1.3.1', title: 'Use case' },
  actor: { section: '18.1.3.1', title: 'Actor' },
  subject: { section: '18.1.3.1', title: 'Subject a use case applies to' },
  association: { section: '18.1.3.1', title: 'Association of an actor with a use case' },
  multiplicity: { section: '18.1.3.1', title: 'Multiplicity at an end of that association' },
  extend: { section: '18.1.3.2', title: 'Extend' },
  extensionPoint: { section: '18.1.3.2', title: 'Extension point' },
  extendCondition: { section: '18.1.3.2', title: 'Condition of an extend' },
  include: { section: '18.1.3.3', title: 'Include' },
  useCaseKeyword: { section: '18.1.4', title: 'Keyword or stereotype above a use case' },
  subjectKeyword: { section: '18.1.4', title: 'Keyword or stereotype above a subject' },
  extensionPointCompartment: { section: '18.1.4', title: 'Compartment listing the extension points' },
  useCaseRectangle: { section: '18.1.4', title: 'Use case as a rectangle with an ellipse icon' },
  extendNote: { section: '18.1.4', title: 'Condition and extension points in a note on the extend' },
  actorRectangle: { section: '18.1.4', title: 'Actor as a rectangle with the keyword «actor»' },
  actorIcon: { section: '18.1.4', title: 'Actor drawn with an icon of its own' },
  ownedUseCases: { section: '18.1.4', title: 'Use cases in a compartment of the classifier that owns them' },
  generalization: { section: '9.2.3.2', title: 'Generalization between actors or between use cases' },
  comment: { section: '7.2.3.2', title: 'Comment (note)' },
} as const satisfies Catalog;
