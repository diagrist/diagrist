import type { ExpansionMode } from '../diagram.js';

/** Control nodes that the description names by their kind. */
export type ControlKind = 'initial' | 'final' | 'flowfinal' | 'decision' | 'merge' | 'fork' | 'join';

/** Nodes that the description names by kind and text. */
export type NamedKind = 'send' | 'accept' | 'wait' | 'datastore' | 'buffer';

/** One alternative out of a decision: its guard (undefined without, `else` for the flag) and its target. */
export interface Alternative {
  readonly guard?: string;
  readonly else: boolean;
  readonly to: string;
}

/** The sentences of an activity description in one locale; names are already phrased, lists not yet joined. */
export interface ActivityProse {
  readonly summary: (title: string, kind: string, nodes: number, flows: number, lanes: number) => string;
  readonly noun: Readonly<Record<ControlKind, string>>;
  readonly named: (kind: NamedKind, label: string) => string;
  readonly object: (label: string, state: string | undefined) => string;
  readonly port: (side: 'in' | 'out', name: string | undefined, region: string) => string;
  /** A text in the quotes of the locale. */
  readonly quote: (text: string) => string;
  readonly lane: (label: string, members: readonly string[]) => string;
  readonly region: (name: string, members: readonly string[]) => string;
  readonly expansion: (
    name: string,
    mode: ExpansionMode,
    collections: readonly string[],
    members: readonly string[],
  ) => string;
  readonly call: (name: string) => string;
  readonly pins: (name: string, inputs: readonly string[], outputs: readonly string[]) => string;
  readonly handler: (protectedAction: string, exception: string, handler: string) => string;
  readonly decision: (name: string, alternatives: readonly Alternative[]) => string;
  readonly fork: (name: string, to: readonly string[]) => string;
  readonly join: (name: string, from: readonly string[], to: readonly string[]) => string;
  readonly merge: (name: string, from: readonly string[], to: readonly string[]) => string;
  readonly flow: (
    from: string,
    object: boolean,
    to: string,
    pins: { readonly from?: string; readonly to?: string },
    weight: number | undefined,
    guard: string | undefined,
  ) => string;
  readonly interrupt: (name: string, region: string, to: string) => string;
}
