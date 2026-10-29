import type { Diagnostic, FileText, KindReading, Span } from '@diagrist/lang';
import type { LinkDecl, TypeDecl } from '../shared/declarations.js';
import type { Graph } from '../shared/graph/model.js';
import { VOCABULARIES, type VocabularyName } from '../shared/vocabularies.js';
import { declarationsOf, readVocabulary } from '../shared/vocabulary.js';
import type { ConceptStatement } from './grammar/spec.js';

export type { Item, Relation } from '../shared/graph/model.js';

type Of<K extends ConceptStatement['keyword']> = Extract<ConceptStatement, { keyword: K }>;

/** The vocabulary file named with `use=`: its path, and the first finding of the language about it, if any. */
export interface Used {
  readonly path: string;
  readonly problem?: Diagnostic;
  /** The `use=` of the header, which a finding about the file points at. */
  readonly span: Span;
}

/** A concept picture as rules, layout and description see it. */
export interface ConceptModel extends Graph {
  readonly vocabulary?: VocabularyName;
  readonly used?: Used;
  /** Declarations of the file whose id a vocabulary declares already; the language reports those of the file twice. */
  readonly repeated: readonly {
    readonly id: string;
    readonly what: 'type' | 'link';
    readonly by: string;
    readonly span: Span;
  }[];
}

const of = <K extends ConceptStatement['keyword']>(reading: KindReading<ConceptStatement>, keyword: K): Of<K>[] =>
  reading.statements.filter((s): s is Of<K> => s.keyword === keyword);

type Repeat = ConceptModel['repeated'][number];

/** Declarations by id, the first of an id winning; a later one of the file is handed to `repeat` with the first. */
function declare<D extends TypeDecl | LinkDecl>(decls: readonly D[], repeat: (d: D, first: D) => void): Map<string, D> {
  const out = new Map<string, D>();
  for (const d of decls) {
    const first = out.get(d.id);
    if (first === undefined) out.set(d.id, d);
    else repeat(d, first);
  }
  return out;
}

const HEADER_SPAN = (line: number): Span => ({ line, column: 1, length: 'diagram'.length });

/**
 * Reads the declarations in force, the vocabulary of the plugin first, then the file of `use=`, then the file's own;
 * the items with their entries; and the relations.
 */
export function conceptModel(reading: KindReading<ConceptStatement>): ConceptModel {
  const attributes = reading.header?.attributes ?? {};
  const vocabulary = attributes.vocabulary as VocabularyName | undefined;
  const file = attributes.use as FileText | undefined;
  const shipped = vocabulary === undefined ? { types: [], links: [] } : VOCABULARIES[vocabulary];
  const fromFile = file === undefined ? undefined : readVocabulary(file.text, file.path);
  const own = declarationsOf(
    reading.statements.filter((s): s is Of<'type' | 'link'> => s.keyword === 'type' || s.keyword === 'link'),
  );
  const repeated: Repeat[] = [];
  const repeat = (what: 'type' | 'link') => (d: TypeDecl | LinkDecl, first: TypeDecl | LinkDecl) => {
    if ('file' in d.origin && 'vocabulary' in first.origin)
      repeated.push({ id: d.id, what, by: first.origin.vocabulary, span: d.origin.file });
  };
  const types = declare([...shipped.types, ...(fromFile?.types ?? []), ...own.types], repeat('type'));
  const links = declare([...shipped.links, ...(fromFile?.links ?? []), ...own.links], repeat('link'));
  const subtitle = attributes.subtitle;
  const problem = fromFile?.diagnostics.find((d) => d.severity === 'error');
  const span = HEADER_SPAN(reading.header?.line ?? 1);
  return {
    title: reading.header?.title ?? '',
    ...(typeof subtitle === 'string' ? { subtitle } : {}),
    ...(vocabulary === undefined ? {} : { vocabulary }),
    ...(file === undefined ? {} : { used: { path: file.path, span, ...(problem ? { problem } : {}) } }),
    types,
    links,
    repeated,
    items: of(reading, 'item').map((s) => ({
      id: s.id,
      label: s.label,
      type: s.clauses.is ?? '',
      ...(s.attributes.status === undefined ? {} : { status: s.attributes.status }),
      entries: s.lines.map((l) => l.text),
      span: s.span,
    })),
    relations: of(reading, 'rel').map((s) => ({
      from: s.from,
      link: s.link,
      to: s.to,
      ...(s.label === undefined ? {} : { label: s.label }),
      span: s.span,
    })),
  };
}
