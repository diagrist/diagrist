import type { Tone } from '@diagrist/core';
import type { Span } from '@diagrist/lang';
import type { Decision } from '@diagrist/parts';
import type { EXPANSION_MODES } from './grammar/frames.js';
import type { NodeKind } from './grammar/values.js';

/** How an expansion region runs per element. */
export type ExpansionMode = (typeof EXPANSION_MODES)[number];

/**
 * An activity diagram as the model reads it: lanes, regions, nodes, edges and handlers in source order. The
 * layout places it by itself; the source gives no grid.
 */
export interface ActivityDiagram {
  readonly title: string;
  readonly subtitle?: string;
  readonly look: 'plain' | 'cards';
  /** Where findings about the diagram as a whole point: the header line. */
  readonly span: Span;
  readonly partitions: readonly Partition[];
  readonly regions: readonly Region[];
  readonly expansions: readonly Expansion[];
  readonly nodes: readonly ActivityNode[];
  readonly flows: readonly Flow[];
  readonly handlers: readonly Handler[];
  readonly decisions: readonly Decision[];
}

export interface Partition {
  readonly id: string;
  readonly label: string;
  readonly tone?: Tone;
  readonly span: Span;
}

/** An interruptible region. */
export interface Region {
  readonly id: string;
  readonly label?: string;
  readonly span: Span;
}

export interface Expansion {
  readonly id: string;
  readonly label?: string;
  readonly mode: ExpansionMode;
  /** Names of the inputs and outputs in their order; empty for one unnamed node. */
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
  readonly span: Span;
}

/** An expansion node on the frame of its region (UML 2.5.1, 16.12.4): inputs on top, outputs at the bottom. */
export interface ExpansionPort {
  readonly region: string;
  readonly side: 'in' | 'out';
  readonly mode: ExpansionMode;
  /** Name from `input=` or `output=` of the region; missing on the one unnamed node. */
  readonly name?: string;
  /** Place in the list of inputs or outputs, from 0. */
  readonly index: number;
}

export interface ActivityNode {
  readonly id: string;
  readonly kind: NodeKind;
  /** Text of the node; empty for start, ends, bars and a diamond without question. */
  readonly label: string;
  readonly state?: string;
  /** Id of the partition named by `in`. */
  readonly lane?: string;
  readonly interruptible?: string;
  readonly expansion?: string;
  /** Pin names in their order, duplicates kept for the rule that reports them. */
  readonly inputs: readonly string[];
  readonly outputs: readonly string[];
  readonly call: boolean;
  readonly tone?: Tone;
  readonly mark?: string;
  readonly span: Span;
  /** Set on the expansion nodes the model adds for a region; they are object nodes on its frame. */
  readonly port?: ExpansionPort;
}

export interface Flow {
  readonly from: string;
  readonly to: string;
  readonly kind: 'control' | 'object';
  /** `~>`: an interrupting edge. */
  readonly interrupt: boolean;
  /** Guard without brackets; `else` is the flag. */
  readonly guard?: string;
  readonly else: boolean;
  readonly pin?: string;
  readonly weight?: number;
  readonly span: Span;
}

/** An exception handler: not an edge, the handler action has none of its own. */
export interface Handler {
  readonly protected: string;
  readonly handler: string;
  readonly exception: string;
  readonly span: Span;
}
