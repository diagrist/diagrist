import type { Tone } from '@diagrist/core';
import type { Header, KindReading } from '@diagrist/lang';
import { type Decision, decisionOf } from '@diagrist/parts';
import type {
  Constraint,
  FragmentOperator,
  Look,
  MessageEvent,
  Misplaced,
  Participant,
  ParticipantKind,
  SequenceDiagram,
  SequenceEvent,
} from './diagram.js';
import { FRAGMENT_OPERATORS, PARTICIPANT_KINDS } from './diagram.js';
import { ARROWS } from './grammar/messages.js';
import type { OperandStatement, SequenceStatement } from './grammar/spec.js';

type Of<K extends SequenceStatement['keyword']> = Extract<SequenceStatement, { keyword: K }>;

/**
 * Statements inside a fragment have the same values as at the top level, plus operand markers. `Infer` stops
 * at the recursion of the tables, so the children are typed here once.
 */
const nested = (statement: {
  readonly children: readonly unknown[];
}): readonly (SequenceStatement | OperandStatement)[] =>
  statement.children as readonly (SequenceStatement | OperandStatement)[];

const withoutOperands = (statement: { readonly children: readonly unknown[] }): readonly SequenceStatement[] =>
  nested(statement).flatMap((child) => (child.keyword === 'else' || child.keyword === 'and' ? [] : [child]));

/** Optional fields are left out instead of set to `undefined`. */
function some<K extends string, V>(key: K, value: V | undefined): { [P in K]?: V } {
  return (value === undefined ? {} : { [key]: value }) as { [P in K]?: V };
}

/** Guards are written without brackets; `"[x]"` is read as `x`, an empty guard as none. */
const bareGuard = (guard: string | undefined): string | undefined =>
  guard?.replace(/^\[(.*)\]$/s, '$1').trim() || undefined;

const isParticipant = (s: SequenceStatement): s is Of<ParticipantKind> =>
  (PARTICIPANT_KINDS as readonly string[]).includes(s.keyword);

const isFragment = (s: SequenceStatement): s is Of<FragmentOperator> =>
  (FRAGMENT_OPERATORS as readonly string[]).includes(s.keyword);

function message(s: Of<'msg'> | Of<'create'>): MessageEvent {
  return {
    type: 'message',
    from: s.from,
    to: s.to,
    kind: s.keyword === 'create' ? 'create' : ARROWS[s.arrow].kind,
    ...some('label', s.label),
    ...some('id', s.attributes.id),
    ...some('mark', s.attributes.mark),
    ...some('duration', s.attributes.duration),
    ...some('emph', s.flags.emph ? true : undefined),
    span: s.span,
  };
}

/**
 * Events in source order. A fragment becomes its begin marker, its own statements, each operand marker with
 * the operand's statements, and an end marker; a coregion likewise. The model and layout work on this list.
 */
function events(statements: readonly SequenceStatement[]): SequenceEvent[] {
  return statements.flatMap((s): SequenceEvent[] => {
    if (s.keyword === 'msg' || s.keyword === 'create') return [message(s)];
    if (s.keyword === 'destroy' || s.keyword === 'activate' || s.keyword === 'deactivate')
      return [{ type: s.keyword, target: s.target, span: s.span }];
    if (s.keyword === 'note') return [{ type: 'note', text: s.text, over: s.attributes.over ?? [], span: s.span }];
    if (s.keyword === 'ref') {
      const { over = [], id, file } = s.attributes;
      return [{ type: 'ref', label: s.label, over, ...some('id', id), ...some('file', file), span: s.span }];
    }
    if (s.keyword === 'invariant') {
      const state = s.flags.state ? true : undefined;
      return [
        { type: 'invariant', text: s.text, ...some('on', s.attributes.on), ...some('state', state), span: s.span },
      ];
    }
    if (s.keyword === 'divider') return [{ type: 'divider', ...some('label', s.label), span: s.span }];
    if (s.keyword === 'coregion')
      return [
        { type: 'coregion', on: s.on, span: s.span },
        ...events(withoutOperands(s)),
        { type: 'end', span: s.span },
      ];
    if (isFragment(s)) return fragment(s);
    return [];
  });
}

function fragment(s: Of<FragmentOperator>): SequenceEvent[] {
  const begin: SequenceEvent = {
    type: 'fragment',
    operator: s.keyword,
    ...some('guard', bareGuard(s.guard)),
    ...some('id', s.attributes.id),
    span: s.span,
  };
  const operands = nested(s).flatMap((child): SequenceEvent[] =>
    child.keyword === 'else' || child.keyword === 'and'
      ? [
          { type: 'operand', operator: child.keyword, ...some('guard', bareGuard(child.guard)), span: child.span },
          ...events(withoutOperands(child)),
        ]
      : events([child]),
  );
  return [begin, ...operands, { type: 'end', span: s.span }];
}

/**
 * Statements written inside a fragment after one of its operand markers, at the level of the marker. They
 * would silently join the operand above them, so the rule `afterOperand` reports them.
 */
function afterOperands(statements: readonly (SequenceStatement | OperandStatement)[]): Misplaced[] {
  return statements.flatMap((s): Misplaced[] => {
    if (!('children' in s)) return [];
    const children = nested(s);
    const first = children.findIndex((c) => c.keyword === 'else' || c.keyword === 'and');
    const marker = children[first];
    const late =
      marker === undefined
        ? []
        : children
            .slice(first + 1)
            .filter((c) => c.keyword !== 'else' && c.keyword !== 'and')
            .map((c) => ({ span: c.span, fragment: s.keyword, operand: marker.keyword }));
    return [...late, ...afterOperands(children)];
  });
}

function participant(s: Of<ParticipantKind>): Participant {
  const { stereotype, tone } = s.attributes;
  return {
    id: s.id,
    kind: s.keyword,
    label: s.label,
    ...some('stereotype', stereotype),
    ...some('external', s.flags.external ? true : undefined),
    ...some<'tone', Tone>('tone', tone),
    span: s.span,
  };
}

function constraint(s: SequenceStatement): Constraint[] {
  if (s.keyword === 'duration') return [{ type: 'duration', from: s.from, to: s.to, text: s.text, span: s.span }];
  if (s.keyword === 'time') return [{ type: 'time', at: s.at, text: s.text, span: s.span }];
  return [];
}

function decision(s: SequenceStatement): Decision[] {
  if (s.keyword !== 'adr') return [];
  return [decisionOf(s)];
}

/** The diagram behind a reading without errors: header, lifelines, flattened events, constraints, decisions. */
export function sequenceDiagram(reading: KindReading<SequenceStatement>): SequenceDiagram {
  const header: Header = reading.header ?? { title: '', attributes: {}, line: 1 };
  const frame = reading.statements.find((s) => s.keyword === 'frame');
  return {
    title: header.title,
    ...some('subtitle', header.attributes.subtitle as string | undefined),
    look: (header.attributes.look as Look | undefined) ?? 'plain',
    participants: reading.statements.filter(isParticipant).map(participant),
    events: events(reading.statements),
    autonumber: reading.statements.some((s) => s.keyword === 'autonumber'),
    ...(frame?.keyword === 'frame' ? { frame: some('label', frame.label) } : {}),
    constraints: reading.statements.flatMap(constraint),
    decisions: reading.statements.flatMap(decision),
    afterOperands: afterOperands(reading.statements),
  };
}
