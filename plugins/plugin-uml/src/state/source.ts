import type { Tone } from '@diagrist/core';
import type { Header, KindReading } from '@diagrist/lang';
import { decisionOf } from '@diagrist/parts';
import type { Behaviour, StateDiagram, Vertex, VertexKind } from './diagram.js';
import type { StateStatement } from './grammar/spec.js';

type Of<K extends StateStatement['keyword']> = Extract<StateStatement, { keyword: K }>;

/** Optional fields are left out instead of set to `undefined`. */
function some<K extends string, V>(key: K, value: V | undefined): { [P in K]?: V } {
  return (value === undefined || value === false || value === '' ? {} : { [key]: value }) as { [P in K]?: V };
}

const VERTEX_KEYWORDS: readonly VertexKind[] = [
  'state',
  'initial',
  'final',
  'choice',
  'junction',
  'history',
  'fork',
  'join',
  'terminate',
  'entrypoint',
  'exitpoint',
  'region',
];

type VertexStatement = Of<VertexKind>;

/** Events of a list written with commas, such as triggers or deferred events. */
export const events = (list: string | undefined): string[] =>
  (list ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

/** A guard or condition as written, without the brackets a writer may have added. */
const bare = (text: string | undefined): string | undefined => text?.trim().replace(/^\[\s*|\s*\]$/g, '') || undefined;

function vertex(s: VertexStatement): Vertex {
  const a = s.attributes as Partial<Record<string, string>>;
  const flags = s.flags as Partial<Record<string, boolean>>;
  return {
    kind: s.keyword,
    id: s.id,
    ...some('label', s.label),
    ...some('parent', s.clauses.in),
    ...some('entry', a.entry),
    ...some('do', a.do),
    ...some('exit', a.exit),
    defer: events(a.defer),
    ...some('submachine', a.submachine),
    ...some('file', a.file),
    deep: flags.deep === true,
    ...some<'tone', Tone>('tone', a.tone as Tone | undefined),
    ...some('mark', a.mark),
    ...some('emph', flags.emph),
    span: s.span,
  };
}

const behaviour = (a: Partial<Record<'on' | 'when' | 'do' | 'post', string>>): Behaviour => ({
  ...some('on', a.on?.trim()),
  ...some('when', bare(a.when)),
  ...some('do', a.do?.trim()),
  ...some('post', bare(a.post)),
});

/** The diagram behind a reading without errors: header, vertices and transitions in source order, decisions. */
export function stateDiagram(reading: KindReading<StateStatement>): StateDiagram {
  const header: Header = reading.header ?? { title: '', attributes: {}, line: 1 };
  const s = reading.statements;
  const of = <K extends StateStatement['keyword']>(k: K) => s.filter((x): x is Of<K> => x.keyword === k);
  return {
    title: header.title,
    ...some('subtitle', header.attributes.subtitle as string | undefined),
    look: header.attributes.look === 'cards' ? 'cards' : 'plain',
    direction: header.attributes.direction === 'right' ? 'right' : 'down',
    protocol: /\{protocol\}/.test(header.title),
    span: { line: header.line, column: 1, length: 7 },
    vertices: s
      .filter((x): x is VertexStatement => (VERTEX_KEYWORDS as readonly string[]).includes(x.keyword))
      .map(vertex),
    transitions: of('go').map((t) => ({
      from: t.from,
      to: t.to,
      ...behaviour(t.attributes),
      ...some('emph', t.flags.emph),
      span: t.span,
    })),
    internals: of('internal').map((i) => ({ state: i.state, ...behaviour(i.attributes), span: i.span })),
    notes: of('note').map((n) => ({ text: n.text, ...some('on', n.clauses.on), span: n.span })),
    decisions: of('adr').map(decisionOf),
  };
}
