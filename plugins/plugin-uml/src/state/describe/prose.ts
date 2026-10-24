import type { VertexKind } from '../diagram.js';

/** A vertex in a sentence: its kind, its name, and what tells it apart from others of its kind. */
export interface Named {
  readonly kind: VertexKind;
  readonly label?: string;
  readonly deep: boolean;
  /** Only when the kind occurs more than once: the name of the parent, or the id at the top level. */
  readonly parent?: string;
  readonly id?: string;
}

/** What a state does, for the parentheses after its name. */
export interface Doings {
  readonly entry?: string;
  readonly do?: string;
  readonly exit?: string;
  readonly defer: readonly string[];
  readonly internals: readonly { readonly on?: string; readonly when?: string; readonly do?: string }[];
}

/** How a transition starts, for its sentence. */
export type Opening =
  | { readonly from: 'initial' | 'pseudo'; readonly source: string }
  | { readonly from: 'point'; readonly source: string; readonly exit: boolean; readonly owner: string }
  | { readonly from: 'time' | 'change'; readonly source: string; readonly event: string }
  | { readonly from: 'event'; readonly source: string; readonly event: string; readonly call: boolean }
  | { readonly from: 'completion'; readonly source: string };

/** The sentences of a state machine description in one locale; names are already phrased. */
export interface StateProse {
  readonly summary: (
    title: string,
    kind: string,
    protocol: boolean,
    states: number,
    pseudo: number,
    regions: number,
    transitions: number,
  ) => string;
  readonly name: (n: Named) => string;
  readonly doings: (d: Doings) => string;
  readonly simple: (name: string, inside: string | undefined, doings: string, plain: boolean) => string;
  readonly submachine: (
    name: string,
    inside: string | undefined,
    doings: string,
    machine: string,
    file: string | undefined,
    rim: string | undefined,
  ) => string;
  readonly composite: (
    name: string,
    inside: string | undefined,
    doings: string,
    kids: string,
    rim: string | undefined,
  ) => string;
  readonly regions: (regions: readonly { readonly name: string; readonly kids: string }[]) => string;
  readonly transition: (
    opening: Opening,
    target: string,
    into: string | undefined,
    self: boolean,
    when: string | undefined,
    effect: string | undefined,
    post: string | undefined,
  ) => string;
  readonly note: (on: string, text: string) => string;
}
