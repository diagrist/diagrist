import type { Locale } from '@diagrist/lang';
import type { EdgeKind } from '../grammar/edges.js';
import type { Level } from '../grammar/elements.js';
import type { NodeShape, NodeStatus, Role } from '../model/types.js';
import { DE } from './de.js';
import { EN } from './en.js';

/**
 * Everything the plugin writes in words in one locale (ADR 0008 Nr. 3): the texts it adds to the picture, its
 * legend, and the words of the description. Title header and decision bar bring their own (`WORDS` in parts);
 * diagnostics keep the kernel's catalogue form by code.
 */
export interface Texts {
  /** Name of each level before the title, as in `Context diagram (C4 L1) · Shop`. */
  readonly kinds: Readonly<Record<Level, string>>;
  /** Legend texts of the kinds of edges. */
  readonly edges: Readonly<Record<EdgeKind, string>>;
  /** Roles of groups, in the head of a frame without `team=` and in the legend. */
  readonly roles: Readonly<Record<Role, string>>;
  /** The status beside the second line of a box, and in the legend and description. */
  readonly status: Readonly<Record<NodeStatus, string>>;
  /**
   * The status as the box writes it. German keeps the predecessor's `abgeloest` until the clean-up with a second
   * baseline (ADR 0008 Nr. 5, docs/burn-down.md); legend and description already write `abgelöst`.
   */
  readonly statusInBox: Readonly<Record<NodeStatus, string>>;
  readonly shapes: Readonly<Record<NodeShape, string>>;
  readonly emph: string;
  readonly replicas: string;
  readonly mark: string;
  readonly icon: string;
  /** Legend entry of a flow with the range of its numbers. */
  readonly flow: (id: string, from: number, to: number) => string;
  readonly prose: Prose;
}

/** The words of the description. */
export interface Prose {
  /** First sentence: title, kind, number of elements and groups. */
  readonly summary: (title: string, kind: string, nodes: number, groups: number) => string;
  /** The kind in the first sentence when `label=""` leaves it out of the title. */
  readonly diagram: string;
  readonly group: string;
  readonly within: string;
  readonly tag: string;
  readonly ungrouped: string;
  readonly layer: string;
  readonly note: string;
  readonly edge: string;
  readonly markOf: string;
  /** A frame without title, named after what it holds. */
  readonly frameAround: string;
  readonly instances: (count: number) => string;
  /** How a flow step happens, by the kind of its edge. */
  readonly kinds: Readonly<Record<EdgeKind, string>>;
}

/** The plugin's texts by locale; the type makes a missing locale a compile error. */
export const TEXTS: Readonly<Record<Locale, Texts>> = { en: EN, de: DE };
