import type { Tone } from '@diagrist/core';
import type { Header, KindReading } from '@diagrist/lang';
import { decisionOf } from '@diagrist/parts';
import type { ClassDiagram, Classifier, ClassifierKind, ClassRelation } from './diagram.js';
import { KIND_OF } from './diagram.js';
import type { ClassStatement } from './grammar/spec.js';

type Of<K extends ClassStatement['keyword']> = Extract<ClassStatement, { keyword: K }>;

/** Optional fields are left out instead of set to `undefined`. */
function some<K extends string, V>(key: K, value: V | undefined): { [P in K]?: V } {
  return (value === undefined || value === false ? {} : { [key]: value }) as { [P in K]?: V };
}

const of = <K extends ClassStatement['keyword']>(statements: readonly ClassStatement[], keyword: K): Of<K>[] =>
  statements.filter((s): s is Of<K> => s.keyword === keyword);

/** A stereotype as written, without guillemets a writer may have added. */
const bare = (text: string | undefined): string | undefined => text?.trim().replace(/^«\s*|\s*»$/g, '') || undefined;

function classifier(s: Of<'class' | 'interface' | 'enum'>): Classifier {
  const { stereotype, template, tone, mark } = s.attributes;
  return {
    kind: s.keyword as ClassifierKind,
    id: s.id,
    label: s.label,
    ...some('package', s.clauses.in),
    abstract: s.flags.abstract,
    ...some('stereotype', bare(stereotype)),
    ...some('template', template?.trim() || undefined),
    members: s.lines.map((l) => ({
      text: l.text.trim(),
      static: l.flags.static,
      abstract: l.flags.abstract,
      span: l.span,
    })),
    ...some<'tone', Tone>('tone', tone),
    ...some('mark', mark),
    ...some('emph', s.flags.emph),
    span: s.span,
  };
}

function relation(s: Of<'rel'>): ClassRelation {
  const { source, card, role, srole, nonav, class: via } = s.attributes;
  const keyword: ClassRelation['keyword'] = s.flags.import ? 'import' : s.flags.access ? 'access' : undefined;
  return {
    from: s.from,
    to: s.to,
    arrow: s.arrow,
    kind: KIND_OF[s.arrow],
    ...some('label', s.label),
    ...some('source', source),
    ...some('srole', srole),
    ...some('card', card),
    ...some('role', role),
    ...some('nonav', nonav),
    ...some('via', via),
    ...some('keyword', keyword),
    ...some('emph', s.flags.emph),
    span: s.span,
  };
}

/** The diagram behind a reading without errors: header, elements in source order, decisions. */
export function classDiagram(reading: KindReading<ClassStatement>): ClassDiagram {
  const header: Header = reading.header ?? { title: '', attributes: {}, line: 1 };
  const s = reading.statements;
  const classifiers = s.filter(
    (x): x is Of<'class' | 'interface' | 'enum'> =>
      x.keyword === 'class' || x.keyword === 'interface' || x.keyword === 'enum',
  );
  return {
    title: header.title,
    ...some('subtitle', header.attributes.subtitle as string | undefined),
    look: header.attributes.look === 'cards' ? 'cards' : 'plain',
    span: { line: header.line, column: 1, length: 7 },
    classifiers: classifiers.map(classifier),
    packages: of(s, 'package').map((p) => ({
      id: p.id,
      label: p.label,
      ...some('parent', p.clauses.in),
      ...some<'tone', Tone>('tone', p.attributes.tone),
      span: p.span,
    })),
    associations: of(s, 'assoc').map((a) => ({
      id: a.id,
      label: a.label ?? '',
      ...some('package', a.clauses.in),
      ...some('via', a.attributes.class),
      ...some('mark', a.attributes.mark),
      ...some('emph', a.flags.emph),
      span: a.span,
    })),
    relations: of(s, 'rel').map(relation),
    notes: of(s, 'note').map((n) => ({ text: n.text, ...some('on', n.clauses.on), span: n.span })),
    decisions: of(s, 'adr').map(decisionOf),
  };
}
