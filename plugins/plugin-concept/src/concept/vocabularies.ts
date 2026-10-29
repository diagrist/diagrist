import type { LinkDecl, TypeDecl } from './declarations.js';

/** The names of the vocabularies of the plugin, in the order the header field lists them. */
export const VOCABULARY_NAMES = ['terms', 'roles'] as const;
export type VocabularyName = (typeof VOCABULARY_NAMES)[number];

/** The declarations a vocabulary brings, as if the file had written them first. */
export interface Vocabulary {
  readonly types: readonly TypeDecl[];
  readonly links: readonly LinkDecl[];
}

type TypeOf = Omit<TypeDecl, 'origin'>;
type LinkOf = Pick<LinkDecl, 'id' | 'label' | 'from' | 'to'> & Partial<Omit<LinkDecl, 'id' | 'label' | 'from' | 'to'>>;

const vocabulary = (name: VocabularyName, types: readonly TypeOf[], links: readonly LinkOf[]): Vocabulary => {
  const origin = { vocabulary: name };
  return {
    types: types.map((t) => ({ ...t, origin })),
    links: links.map((l) => ({
      line: 'solid',
      head: 'arrow',
      acyclic: false,
      upward: false,
      beside: false,
      bare: false,
      ...l,
      origin,
    })),
  };
};

/**
 * Terms of a subject: each with a definition as its entry, the broader term above the narrower, parts below their
 * whole, and terms of the same meaning joined by a dashed line, which a rule asks to settle.
 */
const TERMS = vocabulary(
  'terms',
  [{ id: 'term', label: { en: 'Term', de: 'Begriff' }, shape: 'box', explain: true }],
  [
    {
      id: 'is-a',
      label: { en: 'is a', de: 'ist ein' },
      from: ['term'],
      to: ['term'],
      head: 'triangle',
      acyclic: true,
      upward: true,
      bare: true,
    },
    {
      id: 'part-of',
      label: { en: 'is part of', de: 'ist Teil von' },
      from: ['term'],
      to: ['term'],
      head: 'diamond',
      acyclic: true,
      upward: true,
      bare: true,
    },
    { id: 'relates', label: { en: 'relates to', de: 'bezieht sich auf' }, from: ['term'], to: ['term'] },
    {
      id: 'same-as',
      label: { en: 'means the same as', de: 'bedeutet dasselbe wie' },
      from: ['term'],
      to: ['term'],
      line: 'dashed',
      head: 'none',
      beside: true,
      bare: true,
    },
  ],
);

/** Roles of an organisation: who reports to whom, each to one lead at most and never in a circle, and who deputises. */
const ROLES = vocabulary(
  'roles',
  [{ id: 'role', label: { en: 'Role', de: 'Rolle' }, shape: 'person', explain: false }],
  [
    {
      id: 'reports-to',
      label: { en: 'reports to', de: 'berichtet an' },
      from: ['role'],
      to: ['role'],
      single: 'from',
      acyclic: true,
      upward: true,
      bare: true,
    },
    {
      id: 'deputy',
      label: { en: 'stands in for', de: 'vertritt' },
      from: ['role'],
      to: ['role'],
      line: 'dashed',
      head: 'open',
      beside: true,
      bare: true,
    },
  ],
);

/** The vocabularies of the plugin by name. */
export const VOCABULARIES: Readonly<Record<VocabularyName, Vocabulary>> = { terms: TERMS, roles: ROLES };
