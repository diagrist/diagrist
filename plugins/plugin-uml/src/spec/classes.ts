import type { Catalog } from './catalog.js';

/**
 * The elements of UML 2.5.1 a class diagram can show: classifiers and their features from chapters 9 to 11, packages
 * from chapter 12, and from chapter 7 the comment, templates, multiplicities, imports and dependencies. Sections are
 * the notation or semantics clause that defines the element; titles are Diagrist's own words.
 */
export const CLASSES = {
  comment: { section: '7.2.3.2', title: 'Comment (note)' },
  templateParameter: { section: '7.3.4', title: 'Template parameters in a dashed box at the top right corner' },
  templateBinding: { section: '7.3.4', title: 'Binding of a template, shown as a dependency «bind»' },
  packageImport: { section: '7.4.4', title: 'Package import with the keyword «import» or «access»' },
  multiplicity: { section: '7.5.4', title: 'Multiplicity at an end or of a property' },
  dependency: { section: '7.7.4', title: 'Dependency as a dashed arrow' },
  generalization: { section: '9.2.3.2', title: 'Generalization between classifiers' },
  abstractClassifier: { section: '9.2.4', title: 'Abstract classifier, its name in italics' },
  staticFeature: { section: '9.4.4', title: 'Static feature, underlined' },
  attribute: { section: '9.5.4', title: 'Attribute with visibility, type, multiplicity and properties' },
  operation: { section: '9.6.4', title: 'Operation with visibility, parameters, return type and properties' },
  abstractOperation: { section: '9.6.4', title: 'Abstract operation, in italics' },
  enumeration: { section: '10.2.4', title: 'Enumeration with its literals' },
  interface: { section: '10.4.4', title: 'Interface with the keyword «interface»' },
  interfaceRealization: { section: '10.4.4', title: 'Realization of an interface, dashed with a hollow triangle' },
  class: { section: '11.4.4', title: 'Class with compartments for attributes and operations' },
  association: { section: '11.5.4', title: 'Binary association as a line with its name' },
  roleName: { section: '11.5.4', title: 'Role name at an end of an association' },
  navigability: { section: '11.5.4', title: 'Navigable end with an open arrowhead' },
  nonNavigable: { section: '11.5.4', title: 'Non-navigable end with a small x' },
  aggregation: { section: '11.5.4', title: 'Shared aggregation with a hollow diamond at the whole' },
  composition: { section: '11.5.4', title: 'Composition with a filled diamond at the whole' },
  naryAssociation: { section: '11.5.4', title: 'N-ary association as a diamond with a leg to each end' },
  associationClass: { section: '11.5.4', title: 'Association class joined by a dashed line' },
  package: { section: '12.2.4', title: 'Package as a frame with its name in the tab' },
} as const satisfies Catalog;
