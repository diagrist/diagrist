import { arg, attr, id, optionalArg, type StatementSpec, statement, text } from '@diagrist/lang';
import { implementing, type SpecElement } from '../../spec/catalog.js';
import { INTERACTIONS } from '../../spec/interactions.js';
import { invariant, note, ref } from './annotations.js';
import { activate, create, deactivate, destroy, msg } from './messages.js';
import { lifeline } from './values.js';

/** Statements allowed inside fragments and operands; filled at the end of this module, once all exist. */
const body: StatementSpec[] = [];
const pending: { readonly children: StatementSpec[]; readonly operand?: StatementSpec }[] = [];

const GUARD = 'Condition of the first operand, without brackets; Diagrist adds `[...]`.';
const guard = implementing({ uml: [INTERACTIONS.guard] }, optionalArg('guard', text(), GUARD));
const messageList = optionalArg('guard', text(), GUARD);
const frameId = implementing(
  { uml: [INTERACTIONS.fragmentGate] },
  attr(
    id(),
    'Name of the frame: a message with this name as an end starts or ends at its edge (a gate of the fragment, `f.name` names it).',
  ),
);

const operand = <const K extends 'else' | 'and'>(keyword: K, doc: string, example: string) =>
  statement(
    keyword,
    implementing(
      { uml: [INTERACTIONS.interactionOperand] },
      {
        doc,
        examples: [example],
        arguments: [
          implementing(
            { uml: [INTERACTIONS.guard] },
            optionalArg('guard', text(), 'Condition of this operand, without brackets.'),
          ),
        ],
        children: body,
      },
    ),
  );

export const otherwise = operand(
  'else',
  'The next operand of `alt`, written inside `alt` with its statements indented below it. Without a guard it shows `[else]`. A dashed line separates the operands.',
  'else "invalid token"',
);

export const and = operand(
  'and',
  'The next operand of `par`, `seq` or `strict`, written inside the fragment with its statements indented below it.',
  'and',
);

/** A combined fragment with its operator. Its indented statements are its first operand. */
function fragment<const K extends string>(
  keyword: K,
  operator: SpecElement,
  doc: string,
  example: string,
  next?: StatementSpec,
) {
  const children: StatementSpec[] = [];
  pending.push(next === undefined ? { children } : { children, operand: next });
  const lists = operator === INTERACTIONS.ignore || operator === INTERACTIONS.consider;
  return statement(
    keyword,
    implementing(
      { uml: [INTERACTIONS.combinedFragment, operator, INTERACTIONS.interactionOperand] },
      {
        doc: `${doc} The statements indented below it belong to the fragment; fragments nest.`,
        examples: [example],
        arguments: [lists ? messageList : guard],
        attributes: { id: frameId },
        children,
      },
    ),
  );
}

const ALT = 'Alternatives: the first operand whose guard holds is taken; further operands start with `else`.';
const PAR = 'Parallel operands, separated by `and`; their events interleave freely.';
export const alt = fragment('alt', INTERACTIONS.alternatives, ALT, 'alt "token valid"', otherwise);
export const opt = fragment(
  'opt',
  INTERACTIONS.option,
  'An optional part, taken when its guard holds.',
  'opt "3-D Secure required"',
);
export const loop = fragment(
  'loop',
  INTERACTIONS.loop,
  'A repetition while the guard holds.',
  'loop "at most 3 times" id=retry',
);
export const par = fragment('par', INTERACTIONS.parallel, PAR, 'par', and);
export const breakFragment = fragment(
  'break',
  INTERACTIONS.break,
  'Ends the enclosing interaction when the guard holds.',
  'break "timeout"',
);
export const critical = fragment(
  'critical',
  INTERACTIONS.critical,
  'A critical region: its events are not interleaved.',
  'critical',
);
export const seq = fragment(
  'seq',
  INTERACTIONS.weakSequencing,
  'Weak sequencing of operands, separated by `and`.',
  'seq',
  and,
);
export const strict = fragment(
  'strict',
  INTERACTIONS.strictSequencing,
  'Strict sequencing of operands, separated by `and`.',
  'strict',
  and,
);
export const neg = fragment('neg', INTERACTIONS.negative, 'An invalid trace: what must not happen.', 'neg');
export const assert = fragment('assert', INTERACTIONS.assertion, 'The only valid trace at this point.', 'assert');
export const ignore = fragment(
  'ignore',
  INTERACTIONS.ignore,
  'Messages that may appear anywhere and are ignored; the guard lists their names and shows as `ignore {...}`.',
  'ignore "ping, status"',
);
export const consider = fragment(
  'consider',
  INTERACTIONS.consider,
  'Only the listed messages are considered; the guard lists their names and shows as `consider {...}`.',
  'consider "order, pay"',
);

export const coregion = statement(
  'coregion',
  implementing(
    { uml: [INTERACTIONS.coregion] },
    {
      doc: 'A coregion on the lifeline: the order of the indented events is arbitrary, drawn as square brackets on the lifeline. Only messages from or to it, `activate`, `deactivate` and `note` may stand in it.',
      examples: ['coregion notify'],
      arguments: [arg('on', lifeline(), 'The lifeline whose events are unordered.')],
      children: [msg, activate, deactivate, note],
    },
  ),
);

export const FRAGMENTS = [alt, opt, loop, par, breakFragment, critical, seq, strict, neg, assert, ignore, consider];

body.push(msg, create, destroy, activate, deactivate, note, ref, invariant, coregion, ...FRAGMENTS);
for (const { children, operand: next } of pending) children.push(...body, ...(next ? [next] : []));
