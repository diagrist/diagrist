import type { KindReading, Span } from '@diagrist/lang';
import type { LinkDecl, TypeDecl } from './declarations.js';
import type { ConceptStatement } from './grammar/spec.js';
import { VOCABULARIES, type VocabularyName } from './vocabularies.js';

type Of<K extends ConceptStatement['keyword']> = Extract<ConceptStatement, { keyword: K }>;

/** One thing of a declared type, with its entries. */
export interface Item {
  readonly id: string;
  readonly label: string;
  readonly type: string;
  readonly status?: 'planned' | 'deprecated';
  readonly entries: readonly string[];
  readonly span: Span;
}

/** One relation between two items, by its link. */
export interface Relation {
  readonly from: string;
  readonly link: string;
  readonly to: string;
  readonly label?: string;
  readonly span: Span;
}

/** A concept picture as rules, layout and description see it. */
export interface ConceptModel {
  readonly title: string;
  readonly subtitle?: string;
  readonly vocabulary?: VocabularyName;
  /** The declarations in force: the vocabulary's first, then the file's that do not repeat one of them. */
  readonly types: ReadonlyMap<string, TypeDecl>;
  readonly links: ReadonlyMap<string, LinkDecl>;
  /** Declarations of the file whose id the vocabulary declares already; the language reports those of the file twice. */
  readonly repeated: readonly { readonly id: string; readonly what: 'type' | 'link'; readonly span: Span }[];
  readonly items: readonly Item[];
  readonly relations: readonly Relation[];
}

const of = <K extends ConceptStatement['keyword']>(reading: KindReading<ConceptStatement>, keyword: K): Of<K>[] =>
  reading.statements.filter((s): s is Of<K> => s.keyword === keyword);

const typeOf = (s: Of<'type'>): TypeDecl => ({
  id: s.id,
  label: { en: s.label, de: s.label },
  shape: s.attributes.shape ?? 'box',
  explain: s.flags.explain,
  origin: { file: s.span },
});

const linkOf = (s: Of<'link'>): LinkDecl => ({
  id: s.id,
  label: { en: s.label, de: s.label },
  from: s.attributes.from ?? [],
  to: s.attributes.to ?? [],
  line: s.attributes.line ?? 'solid',
  head: s.attributes.head ?? 'arrow',
  ...(s.attributes.each === undefined ? {} : { each: s.attributes.each }),
  ...(s.attributes.single === undefined ? {} : { single: s.attributes.single }),
  acyclic: s.flags.acyclic,
  upward: s.flags.upward,
  beside: s.flags.beside,
  bare: s.flags.bare,
  origin: { file: s.span },
});

/** Declarations by id, the first of an id winning; the later ones are handed to `repeat`. */
function declare<D extends { readonly id: string; readonly origin: TypeDecl['origin'] }>(
  decls: readonly D[],
  repeat: (d: D) => void,
): Map<string, D> {
  const out = new Map<string, D>();
  for (const d of decls) {
    if (out.has(d.id)) repeat(d);
    else out.set(d.id, d);
  }
  return out;
}

/** Reads the declarations of the vocabulary and the file, the items with their entries, and the relations. */
export function conceptModel(reading: KindReading<ConceptStatement>): ConceptModel {
  const attributes = reading.header?.attributes ?? {};
  const vocabulary = attributes.vocabulary as VocabularyName | undefined;
  const base = vocabulary === undefined ? { types: [], links: [] } : VOCABULARIES[vocabulary];
  const repeated: { id: string; what: 'type' | 'link'; span: Span }[] = [];
  const repeat = (what: 'type' | 'link') => (d: TypeDecl | LinkDecl) => {
    if ('file' in d.origin) repeated.push({ id: d.id, what, span: d.origin.file });
  };
  const types = declare([...base.types, ...of(reading, 'type').map(typeOf)], repeat('type'));
  const links = declare([...base.links, ...of(reading, 'link').map(linkOf)], repeat('link'));
  const subtitle = attributes.subtitle;
  return {
    title: reading.header?.title ?? '',
    ...(typeof subtitle === 'string' ? { subtitle } : {}),
    ...(vocabulary === undefined ? {} : { vocabulary }),
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
