import type { Tone } from '@diagrist/core';
import type { Span } from '@diagrist/lang';
import type { Decision } from '@diagrist/parts';

/** What a vertex of a state machine is: a state, a final state, a pseudostate, or a region of a state. */
export type VertexKind =
  | 'state'
  | 'initial'
  | 'final'
  | 'choice'
  | 'junction'
  | 'history'
  | 'fork'
  | 'join'
  | 'terminate'
  | 'entrypoint'
  | 'exitpoint'
  | 'region';

/** A state machine diagram as the model reads it: vertices, transitions, internal transitions and notes. */
export interface StateDiagram {
  readonly title: string;
  readonly subtitle?: string;
  readonly look: 'plain' | 'cards';
  readonly direction: 'down' | 'right';
  /** `{protocol}` in the title: a protocol state machine. */
  readonly protocol: boolean;
  /** Where findings about the diagram as a whole point: the header line. */
  readonly span: Span;
  readonly vertices: readonly Vertex[];
  readonly transitions: readonly Transition[];
  readonly internals: readonly Internal[];
  readonly notes: readonly StateNote[];
  readonly decisions: readonly Decision[];
}

/** A state, pseudostate or region; behaviour, submachine, tone and mark exist on states only. */
export interface Vertex {
  readonly kind: VertexKind;
  readonly id: string;
  readonly label?: string;
  /** The state or region it lies in. */
  readonly parent?: string;
  readonly entry?: string;
  readonly do?: string;
  readonly exit?: string;
  /** Deferred events in their order. */
  readonly defer: readonly string[];
  readonly submachine?: string;
  readonly file?: string;
  readonly deep: boolean;
  readonly tone?: Tone;
  readonly mark?: string;
  readonly emph?: boolean;
  readonly span: Span;
}

/** What a transition says: trigger, guard, effect and, in a protocol state machine, the postcondition. */
export interface Behaviour {
  readonly on?: string;
  readonly when?: string;
  readonly do?: string;
  readonly post?: string;
}

export interface Transition extends Behaviour {
  readonly from: string;
  readonly to: string;
  readonly emph?: boolean;
  readonly span: Span;
}

export interface Internal extends Behaviour {
  readonly state: string;
  readonly span: Span;
}

export interface StateNote {
  readonly text: string;
  /** The vertex; a note without it is reported and not drawn. */
  readonly on?: string;
  readonly span: Span;
}
