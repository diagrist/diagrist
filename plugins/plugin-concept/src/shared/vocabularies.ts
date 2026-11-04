import { readVocabulary, type Vocabulary } from './vocabulary.js';

/** The names of the vocabularies of the plugin, in the order the header field lists them. */
export const VOCABULARY_NAMES = ['terms', 'roles'] as const;
export type VocabularyName = (typeof VOCABULARY_NAMES)[number];

/**
 * The vocabularies of the plugin as vocabulary files, read the way a picture reads its own with `use=`.
 *
 * `terms`: each term with a definition as its entry, the broader term above the narrower, parts below their whole,
 * and terms of the same meaning joined by a dashed line, which a rule asks to settle. `roles`: who reports to whom,
 * each to one lead at most and never in a circle, and who stands in for whom beside them.
 */
export const VOCABULARY_SOURCES: Readonly<Record<VocabularyName, string>> = {
  terms: [
    'diagram vocabulary "Terms"',
    'type term "Term" de="Begriff" explain',
    'link is-a "is a" de="ist ein" from=term to=term head=triangle acyclic upward bare',
    'link part-of "is part of" de="ist Teil von" from=term to=term head=diamond acyclic upward bare',
    'link relates "relates to" de="bezieht sich auf" from=term to=term',
    'link same-as "means the same as" de="bedeutet dasselbe wie" from=term to=term line=dashed head=none beside bare',
  ].join('\n'),
  roles: [
    'diagram vocabulary "Roles"',
    'type role "Role" de="Rolle" shape=person',
    'link reports-to "reports to" de="berichtet an" from=role to=role single=from acyclic upward bare',
    'link deputy "stands in for" de="vertritt" from=role to=role line=dashed head=open beside bare',
  ].join('\n'),
};

const readShipped = (name: VocabularyName): Vocabulary => {
  const { diagnostics, ...vocabulary } = readVocabulary(VOCABULARY_SOURCES[name], name);
  if (diagnostics.length > 0) throw new Error(`The vocabulary ${name} of the plugin does not read cleanly`);
  return vocabulary;
};

/** The vocabularies of the plugin by name. */
export const VOCABULARIES: Readonly<Record<VocabularyName, Vocabulary>> = {
  terms: readShipped('terms'),
  roles: readShipped('roles'),
};
