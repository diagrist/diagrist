import type { Span } from '@diagrist/lang';
import type { FragmentEvent, Participant, SequenceDiagram, SequenceEvent } from '../diagram.js';
import type { SeqGate } from './gates.js';

/** An event that is no fragment marker: message, destruction, reference, note, activation and the like. */
export type TimelineEvent = Exclude<SequenceEvent, { type: 'fragment' | 'operand' | 'end' }>;

/** An operand starts with its fragment or with `else`/`and`; `index` is that event. */
export interface SeqOperand {
  readonly index: number;
  readonly guard: string | undefined;
  readonly marker: 'begin' | 'else' | 'and';
  readonly items: SeqItem[];
}

/** A combined fragment as a node of the tree. */
export interface SeqFragment {
  readonly kind: 'fragment';
  readonly index: number;
  readonly event: FragmentEvent;
  readonly operands: SeqOperand[];
  /** Index of its end marker. */
  end: number | undefined;
  /** Nesting depth, 0 at the top level. */
  readonly depth: number;
}

/** A coregion on a lifeline: from `index` to `end` the order of its events is arbitrary (UML 2.5.1, 17.6.4.10). */
export interface SeqCoregion {
  readonly kind: 'coregion';
  readonly index: number;
  readonly on: string;
  readonly span: Span;
  end: number | undefined;
}

export interface SeqLeaf {
  readonly kind: 'event';
  readonly index: number;
  readonly event: TimelineEvent;
}

export type SeqItem = SeqFragment | SeqLeaf;

/**
 * An activation bar as a range of event indexes. `call`: synchronous call until its reply, `self`: self call
 * (until a reply to itself, otherwise short), `create`: constructor until its reply, `explicit`: `activate`
 * until `deactivate`.
 */
export interface SeqActivation {
  readonly lifeline: string;
  readonly from: number;
  to: number;
  level: number;
  readonly cause: 'call' | 'self' | 'explicit' | 'create';
}

/**
 * What the model noticed while it paired calls and bars. It names the case, not a diagnostic code: the rule that
 * reports the case owns the code, and the catalogue owns the text (ADR 0004).
 */
export type SeqIssueCase = 'replyWithoutCall' | 'deactivateWithoutActivate' | 'openActivation';

/** A finding made while building the model, reported by the rule for its case. */
export interface SeqIssue {
  readonly case: SeqIssueCase;
  readonly span: Span;
  readonly values: Readonly<Record<string, string>>;
}

export interface SequenceModel {
  readonly diagram: SequenceDiagram;
  readonly participants: ReadonlyMap<string, Participant>;
  /** Ids in declaration order. */
  readonly order: readonly string[];
  readonly root: readonly SeqItem[];
  /** All fragments in the order they begin. */
  readonly fragments: readonly SeqFragment[];
  readonly activations: readonly SeqActivation[];
  /** Calls that got a reply, by the index of the call. */
  readonly answered: ReadonlySet<number>;
  readonly issues: readonly SeqIssue[];
  /** Name in the tag `sd` of the frame around the interaction; missing without `frame` and without gates. */
  readonly framed: string | undefined;
  /** Coregions in the order they begin. */
  readonly coregions: readonly SeqCoregion[];
  /** For each message, its end on a frame (`sd`, reference or fragment). */
  readonly gates: ReadonlyMap<number, SeqGate>;
  /** Message ends that are gates and no lifelines. */
  readonly gateIds: ReadonlySet<string>;
  /** Frames of references and fragments with `id=`, with the index of their event. */
  readonly frameIds: ReadonlyMap<string, number>;
}
