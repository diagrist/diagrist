import type { Tone } from '@diagrist/core';
import type { Header, KindReading } from '@diagrist/lang';
import { decisionOf } from '@diagrist/parts';
import type { Actor, Relation, RelationKind, UseCase, UseCaseDiagram } from './diagram.js';
import type { UseCaseStatement } from './grammar/spec.js';
import { splitNames } from './grammar/values.js';

type Of<K extends UseCaseStatement['keyword']> = Extract<UseCaseStatement, { keyword: K }>;

/** Optional fields are left out instead of set to `undefined`. */
function some<K extends string, V>(key: K, value: V | undefined): { [P in K]?: V } {
  return (value === undefined || value === false ? {} : { [key]: value }) as { [P in K]?: V };
}

const of = <K extends UseCaseStatement['keyword']>(statements: readonly UseCaseStatement[], keyword: K): Of<K>[] =>
  statements.filter((s): s is Of<K> => s.keyword === keyword);

function actor(s: Of<'actor'>): Actor {
  const { kind, side, tone, mark } = s.attributes;
  return {
    id: s.id,
    label: s.label,
    system: kind === 'system',
    ...some('side', side),
    ...some<'tone', Tone>('tone', tone),
    ...some('mark', mark),
    ...some('emph', s.flags.emph),
    span: s.span,
  };
}

function useCase(s: Of<'usecase'>): UseCase {
  const { points, form, stereotype, tone, mark } = s.attributes;
  return {
    id: s.id,
    label: s.label,
    ...some('subject', s.clauses.in),
    points: splitNames(points),
    classifier: form === 'classifier',
    ...some('stereotype', stereotype?.trim().replace(/^«\s*|\s*»$/g, '') || undefined),
    ...some<'tone', Tone>('tone', tone),
    ...some('mark', mark),
    ...some('emph', s.flags.emph),
    span: s.span,
  };
}

/** `--` and `-|>` name their kind; `-->` names it with exactly one of the flags `include` and `extend`. */
function kindOf(s: Of<'rel'>, flagged: readonly ('include' | 'extend')[]): RelationKind | undefined {
  if (s.arrow === '-->') return flagged.length === 1 ? flagged[0] : undefined;
  if (flagged.length > 0) return undefined;
  return s.arrow === '--' ? 'association' : 'generalization';
}

function relation(s: Of<'rel'>): Relation {
  const flagged = (['include', 'extend'] as const).filter((f) => s.flags[f]);
  const { source, card, when, at } = s.attributes;
  const points = splitNames(at);
  return {
    from: s.from,
    to: s.to,
    arrow: s.arrow,
    ...some('kind', kindOf(s, flagged)),
    flagged,
    ...some('label', s.label),
    ...some('source', source),
    ...some('card', card),
    ...some('when', when?.trim().replace(/^\{\s*|\s*\}$/g, '') || undefined),
    ...some('at', at === undefined ? undefined : points),
    ...some('emph', s.flags.emph),
    span: s.span,
  };
}

/** The diagram behind a reading without errors: header, elements in source order, decisions. */
export function useCaseDiagram(reading: KindReading<UseCaseStatement>): UseCaseDiagram {
  const header: Header = reading.header ?? { title: '', attributes: {}, line: 1 };
  const s = reading.statements;
  return {
    title: header.title,
    ...some('subtitle', header.attributes.subtitle as string | undefined),
    look: header.attributes.look === 'cards' ? 'cards' : 'plain',
    ...some('direction', header.attributes.direction as 'down' | 'right' | undefined),
    span: { line: header.line, column: 1, length: 7 },
    actors: of(s, 'actor').map(actor),
    subjects: of(s, 'subject').map((x) => ({
      id: x.id,
      label: x.label,
      ...some<'tone', Tone>('tone', x.attributes.tone),
      span: x.span,
    })),
    cases: of(s, 'usecase').map(useCase),
    relations: of(s, 'rel').map(relation),
    notes: of(s, 'note').map((n) => ({ text: n.text, ...some('on', n.clauses.on), span: n.span })),
    decisions: of(s, 'adr').map(decisionOf),
  };
}
