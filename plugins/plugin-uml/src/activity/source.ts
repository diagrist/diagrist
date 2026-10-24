import type { Tone } from '@diagrist/core';
import type { Header, KindReading } from '@diagrist/lang';
import { decisionOf } from '@diagrist/parts';
import { splitNames } from '../shared/values.js';
import type { ActivityDiagram, ActivityNode, Expansion, Flow } from './diagram.js';
import type { ActivityStatement } from './grammar/spec.js';
import { NODE_KEYWORDS, type NodeKind } from './grammar/values.js';

type Of<K extends ActivityStatement['keyword']> = Extract<ActivityStatement, { keyword: K }>;

/** Optional fields are left out instead of set to `undefined`. */
function some<K extends string, V>(key: K, value: V | undefined): { [P in K]?: V } {
  return (value === undefined || value === false ? {} : { [key]: value }) as { [P in K]?: V };
}

const of = <K extends ActivityStatement['keyword']>(statements: readonly ActivityStatement[], keyword: K): Of<K>[] =>
  statements.filter((s): s is Of<K> => s.keyword === keyword);

const isNode = (s: ActivityStatement): s is Of<NodeKind> => (NODE_KEYWORDS as readonly string[]).includes(s.keyword);

/** The attributes every node statement may have; each table allows only its own, so the others stay undefined. */
interface NodeAttributes {
  readonly interruptible?: string;
  readonly expansion?: string;
  readonly input?: string;
  readonly output?: string;
  readonly state?: string;
  readonly tone?: Tone;
  readonly mark?: string;
}

function node(s: Of<NodeKind>): ActivityNode {
  const a: NodeAttributes = s.attributes;
  const label = 'label' in s ? s.label : 'question' in s ? s.question : undefined;
  return {
    id: s.id,
    kind: s.keyword,
    label: label ?? '',
    ...some('state', a.state),
    ...some('lane', s.clauses.in),
    ...some('interruptible', a.interruptible),
    ...some('expansion', a.expansion),
    inputs: splitNames(a.input),
    outputs: splitNames(a.output),
    call: 'call' in s.flags && s.flags.call,
    ...some('tone', a.tone),
    ...some('mark', a.mark),
    span: s.span,
  };
}

/** A guard as written, without the brackets the picture adds; `"else"` is the flag. */
const bare = (guard: string | undefined): string | undefined =>
  guard?.trim().replace(/^\[\s*|\s*\]$/g, '') || undefined;

function flow(s: Of<'go'>): Flow {
  const guard = bare(s.guard);
  return {
    from: s.from,
    to: s.to,
    kind: s.arrow === '=>' ? 'object' : 'control',
    interrupt: s.arrow === '~>',
    ...some('guard', guard === 'else' ? undefined : guard),
    else: s.flags.else || guard === 'else',
    ...some('pin', s.attributes.pin),
    ...some('weight', s.attributes.weight),
    span: s.span,
  };
}

function expansion(s: Of<'expansion'>): Expansion {
  return {
    id: s.id,
    ...some('label', s.label),
    mode: s.attributes.mode ?? 'iterative',
    inputs: splitNames(s.attributes.input),
    outputs: splitNames(s.attributes.output),
    span: s.span,
  };
}

/** The diagram behind a reading without errors: header, lanes, regions, nodes and edges in source order. */
export function activityDiagram(reading: KindReading<ActivityStatement>): ActivityDiagram {
  const header: Header = reading.header ?? { title: '', attributes: {}, line: 1 };
  const s = reading.statements;
  return {
    title: header.title,
    ...some('subtitle', header.attributes.subtitle as string | undefined),
    look: header.attributes.look === 'cards' ? 'cards' : 'plain',
    span: { line: header.line, column: 1, length: 7 },
    partitions: of(s, 'partition').map((p) => ({
      id: p.id,
      label: p.label,
      ...some<'tone', Tone>('tone', p.attributes.tone),
      span: p.span,
    })),
    regions: of(s, 'interruptible').map((r) => ({ id: r.id, ...some('label', r.label), span: r.span })),
    expansions: of(s, 'expansion').map(expansion),
    nodes: s.filter(isNode).map(node),
    flows: of(s, 'go').map(flow),
    handlers: of(s, 'handler').map((h) => ({
      protected: h.protected,
      handler: h.handler,
      exception: h.exception,
      span: h.span,
    })),
    decisions: of(s, 'adr').map(decisionOf),
  };
}
