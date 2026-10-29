import { localeAttribute } from '@diagrist/core';
import { attr, type Diagnostic, type Infer, kind, read, readKind, text } from '@diagrist/lang';
import type { LinkDecl, Origin, TypeDecl } from './declarations.js';
import { linkOf, linkStatement, typeOf, typeStatement } from './declare.js';

const statements = [typeStatement, linkStatement] as const;

/** The tables of a vocabulary file: types and links, which concept pictures build on with `use=`. */
export const vocabularySpec = kind('vocabulary', {
  doc: 'A vocabulary of a business subject: the types of things and the types of relations between them, with the rules each relation keeps. A concept picture names the file with `use=` and writes only items and relations; drawn on its own, the vocabulary shows its types and links as a picture of the subject.',
  header: {
    subtitle: attr(text(), 'Second line below the title.'),
    locale: localeAttribute,
  },
  statements,
});

/** Typed value of a statement of a vocabulary file, derived from the tables (ADR 0004). */
export type VocabularyStatement = Infer<(typeof statements)[number]>;

/** The declarations of a vocabulary, as if a picture had written them first. */
export interface Vocabulary {
  readonly title: string;
  readonly types: readonly TypeDecl[];
  readonly links: readonly LinkDecl[];
}

/** The declarations of the statements of a vocabulary, all from `origin`, or from their own lines when it is left out. */
export function declarationsOf(statements: readonly VocabularyStatement[], origin?: Origin): Omit<Vocabulary, 'title'> {
  const from = (s: VocabularyStatement): Origin => origin ?? { file: s.span };
  return {
    types: statements.flatMap((s) => (s.keyword === 'type' ? [typeOf(s, from(s))] : [])),
    links: statements.flatMap((s) => (s.keyword === 'link' ? [linkOf(s, from(s))] : [])),
  };
}

/**
 * Reads the text of a vocabulary file as declarations that come from `name`, with the findings of the language
 * about it. A text that is no vocabulary reads as one without declarations and a finding about its first line.
 */
export function readVocabulary(
  source: string,
  name: string,
): Vocabulary & { readonly diagnostics: readonly Diagnostic[] } {
  const tree = read(source);
  const reading = readKind(vocabularySpec, tree.document, { path: name });
  return {
    title: reading.header?.title ?? name,
    ...declarationsOf(reading.statements, { vocabulary: name }),
    diagnostics: [...tree.diagnostics, ...reading.diagnostics],
  };
}
