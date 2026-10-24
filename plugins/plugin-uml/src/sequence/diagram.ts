import type { Tone } from '@diagrist/core';
import type { Span } from '@diagrist/lang';
import type { Decision } from '@diagrist/parts';

/**
 * A sequence diagram as the model reads it: lifelines in declaration order and events in source order.
 * Fragments are flat markers here (begin, operand, end), flattened from the nested statements, because every
 * marker takes a row in the layout (ADR 0008 Nr. 4).
 */
export interface SequenceDiagram {
  readonly title: string;
  readonly subtitle?: string;
  readonly look: Look;
  readonly participants: readonly Participant[];
  readonly events: readonly SequenceEvent[];
  readonly autonumber: boolean;
  /** Frame `sd` around the interaction; without a label it shows the title. */
  readonly frame?: { readonly label?: string };
  readonly constraints: readonly Constraint[];
  readonly decisions: readonly Decision[];
  /** Statements that stand in a fragment after an operand marker instead of below it (rule `afterOperand`). */
  readonly afterOperands: readonly Misplaced[];
}

/** A statement at the wrong level of a fragment, with the fragment and the marker it follows. */
export interface Misplaced {
  readonly span: Span;
  readonly fragment: string;
  readonly operand: string;
}

/** `plain` draws the UML notation, `cards` the same layout with toned cards. */
export type Look = 'plain' | 'cards';

export const PARTICIPANT_KINDS = [
  'participant',
  'actor',
  'database',
  'queue',
  'boundary',
  'control',
  'entity',
] as const;

export type ParticipantKind = (typeof PARTICIPANT_KINDS)[number];

export interface Participant {
  readonly id: string;
  readonly kind: ParticipantKind;
  readonly label: string;
  readonly stereotype?: string;
  readonly external?: boolean;
  readonly tone?: Tone;
  readonly span: Span;
}

/** `sync` is `->`, `async` is `~>`, `reply` is `-->`, `create` is the `create` statement. */
export type MessageKind = 'sync' | 'async' | 'reply' | 'create';

export const FRAGMENT_OPERATORS = [
  'alt',
  'opt',
  'loop',
  'par',
  'break',
  'critical',
  'seq',
  'strict',
  'neg',
  'assert',
  'ignore',
  'consider',
] as const;

export type FragmentOperator = (typeof FRAGMENT_OPERATORS)[number];

/** Message ends that are no lifeline: the unknown receiver, the unknown sender, the frame of the interaction. */
export const LOST = 'lost';
export const FOUND = 'found';
export const GATE = 'gate';

export interface MessageEvent {
  readonly type: 'message';
  readonly from: string;
  readonly to: string;
  readonly kind: MessageKind;
  readonly label?: string;
  readonly id?: string;
  readonly mark?: string;
  readonly duration?: string;
  readonly emph?: boolean;
  readonly span: Span;
}

export type FragmentEvent = {
  readonly type: 'fragment';
  readonly operator: FragmentOperator;
  readonly guard?: string;
  readonly id?: string;
  readonly span: Span;
};

export type SequenceEvent =
  | MessageEvent
  | FragmentEvent
  | { readonly type: 'operand'; readonly operator: 'else' | 'and'; readonly guard?: string; readonly span: Span }
  | { readonly type: 'end'; readonly span: Span }
  | { readonly type: 'destroy' | 'activate' | 'deactivate'; readonly target: string; readonly span: Span }
  | {
      readonly type: 'ref';
      readonly label: string;
      readonly over: readonly string[];
      readonly id?: string;
      readonly file?: string;
      readonly span: Span;
    }
  | { readonly type: 'note'; readonly text: string; readonly over: readonly string[]; readonly span: Span }
  | { readonly type: 'coregion'; readonly on: string; readonly span: Span }
  | { readonly type: 'divider'; readonly label?: string; readonly span: Span }
  | {
      readonly type: 'invariant';
      readonly text: string;
      readonly on?: string;
      readonly state?: boolean;
      readonly span: Span;
    };

/** Time constraints (UML 2.5.1, 8.4): a duration between two named messages, or the time of one. */
export type Constraint =
  | {
      readonly type: 'duration';
      readonly from: string;
      readonly to: string;
      readonly text: string;
      readonly span: Span;
    }
  | { readonly type: 'time'; readonly at: string; readonly text: string; readonly span: Span };
