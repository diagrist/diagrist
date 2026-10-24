import type { FragmentOperator, MessageKind, ParticipantKind } from '../diagram.js';

/** Where a gate lies, phrased: on the frame `sd`, on a reference or on a fragment. */
export type GatePlace =
  | { readonly at: 'frame'; readonly name?: string }
  | { readonly at: 'ref'; readonly name?: string; readonly label: string }
  | { readonly at: 'fragment'; readonly name?: string; readonly operator: string };

/**
 * The sentences of a sequence description in one locale. `n` is the message number, `text` the label
 * already formatted as `: label` or empty.
 */
export interface Prose {
  readonly summary: (title: string, kind: string, participants: number, messages: number) => string;
  readonly lineup: (list: string) => string;
  readonly noun: Readonly<Record<ParticipantKind, string>>;
  readonly external: string;
  readonly numbered: string;
  readonly framed: (name: string) => string;
  readonly opening: Readonly<Record<FragmentOperator, readonly [string, string]>>;
  readonly plain: (kind: MessageKind | 'self', n: number, a: string, b: string, text: string) => string;
  readonly selfReply: (n: number, a: string, text: string) => string;
  readonly lost: (n: number, a: string, call: boolean, text: string) => string;
  readonly found: (n: number, b: string, call: boolean, text: string) => string;
  readonly gate: (place: GatePlace) => string;
  readonly gateIn: (kind: MessageKind, n: number, b: string, gate: string, outside: boolean, text: string) => string;
  readonly gateOut: (kind: MessageKind, n: number, a: string, gate: string, outside: boolean, text: string) => string;
  readonly extras: (duration: string | undefined, mark: string | undefined) => readonly string[];
  readonly coregion: (name: string) => string;
  readonly divider: (label: string | undefined) => string;
  readonly destroy: (name: string) => string;
  readonly ref: (label: string, file: string | undefined, over: string) => string;
  readonly note: (over: string, text: string) => string;
  readonly activate: (name: string) => string;
  readonly deactivate: (name: string) => string;
  readonly invariant: (name: string, text: string, state: boolean) => string;
  readonly message: (n: number) => string;
  readonly duration: (from: string, to: string, text: string) => string;
  readonly time: (at: string, text: string) => string;
}

/** `n` with the singular or plural noun. */
export const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;
