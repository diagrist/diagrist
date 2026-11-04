import type { KindReading } from '@diagrist/lang';
import type { LinkDecl, TypeDecl } from '../shared/declarations.js';
import { declarationsOf, type VocabularyStatement } from '../shared/vocabulary.js';

/** A vocabulary file as its rules and its picture see it: the types and links it declares, by id. */
export interface VocabularyModel {
  readonly title: string;
  readonly subtitle?: string;
  readonly types: ReadonlyMap<string, TypeDecl>;
  readonly links: ReadonlyMap<string, LinkDecl>;
}

/** Reads the declarations of a vocabulary file, each from its own line. */
export function vocabularyModel(reading: KindReading<VocabularyStatement>): VocabularyModel {
  const { types, links } = declarationsOf(reading.statements);
  const subtitle = reading.header?.attributes.subtitle;
  return {
    title: reading.header?.title ?? '',
    ...(typeof subtitle === 'string' ? { subtitle } : {}),
    types: new Map(types.map((t) => [t.id, t])),
    links: new Map(links.map((l) => [l.id, l])),
  };
}
