import type { Tone } from '@diagrist/core';
import type { Origin, Span } from '@diagrist/lang';
import type { Decision } from '@diagrist/parts';
import type { EdgeKind } from '../grammar/edges.js';
import type { ElementKeyword, FORMS, Level, SHAPES, STATUSES } from '../grammar/elements.js';
import type { LOOKS } from '../grammar/spec.js';
import type { Place, SpanEnd } from '../grammar/values.js';

export type Look = (typeof LOOKS)[number];
export type NodeShape = (typeof SHAPES)[number];
export type NodeStatus = (typeof STATUSES)[number];
export type NodeForm = (typeof FORMS)[number];

/** Responsibility of a group, and of the elements in it. */
export type Role = 'own' | 'shared' | 'external';

/** An element with the values of its `style` filled in where it sets none. */
export interface ArchNode {
  readonly id: string;
  readonly keyword: ElementKeyword;
  readonly label: string;
  readonly tech?: string;
  readonly icon?: string;
  readonly at?: Place;
  readonly span?: SpanEnd;
  readonly slot?: { readonly index: number; readonly count: number };
  /** Id of the group it lies in directly. */
  readonly group?: string;
  readonly mark?: string;
  readonly emph: boolean;
  readonly shape?: NodeShape;
  readonly status?: NodeStatus;
  readonly replicas?: number;
  readonly width?: number;
  readonly height?: number;
  readonly tone?: Tone;
  readonly form?: NodeForm;
  /** In a diff picture (ADR 0021): whether the element is new, changed or gone; absent means unchanged. */
  readonly origin?: Origin;
  readonly source: Span;
}

export interface ArchGroup {
  readonly id: string;
  readonly title: string;
  /** Missing when the source names none or several; the rules report it. */
  readonly role?: Role;
  /** All roles the source names, for the rule that wants exactly one. */
  readonly roles: readonly Role[];
  readonly team?: string;
  readonly parent?: string;
  readonly heading: 'top' | 'side';
  readonly tag?: string;
  readonly cover?: string;
  readonly tone?: Tone;
  /** Ids of the elements directly in it, in source order. */
  readonly members: readonly string[];
  readonly source: Span;
}

/** A numbered step: its flow, its number across all flows, and whether the flow is drawn in the accent colour. */
export interface Step {
  readonly flow: string;
  readonly n: number;
  readonly accent: boolean;
}

/** An edge in drawing order: flow steps first, then free edges; `index` is its place in that order. */
export interface ArchEdge {
  readonly index: number;
  readonly from: string;
  readonly to: string;
  readonly kind: EdgeKind;
  readonly label?: string;
  readonly via?: string;
  readonly schedule?: string;
  readonly volume?: string;
  readonly sla?: string;
  readonly mark?: string;
  readonly bundle?: string;
  readonly lane?: string;
  readonly tone?: Tone;
  /** A step of a flow; a step a diff picture shows as removed has none, so the numbers stay those of the variant. */
  readonly step?: Step;
  /** In a diff picture (ADR 0021): whether the edge is new, changed or gone; absent means unchanged. */
  readonly origin?: Origin;
  readonly source: Span;
}

/** A flow with the range of its step numbers. */
export interface Flow {
  readonly id: string;
  readonly accent: boolean;
  readonly from: number;
  readonly to: number;
}

export interface Layer {
  readonly row: string;
  readonly label: string;
  readonly source: Span;
}

export interface Note {
  readonly text: string;
  readonly on?: string;
  readonly source: Span;
}

/** One `grid` line, kept for the rules that check names. */
export interface GridLine {
  readonly axis: 'cols' | 'rows';
  readonly names: readonly string[];
  readonly source: Span;
}

/** A C4 diagram of one level as the layout and the rules see it. */
export interface ArchitectureModel {
  readonly level: Level;
  readonly title: string;
  readonly subtitle?: string;
  readonly label?: string;
  readonly look: Look;
  readonly adaptive: boolean;
  readonly cols: readonly string[];
  readonly rows: readonly string[];
  readonly grids: readonly GridLine[];
  readonly nodes: readonly ArchNode[];
  readonly groups: readonly ArchGroup[];
  readonly edges: readonly ArchEdge[];
  readonly flows: readonly Flow[];
  readonly layers: readonly Layer[];
  readonly notes: readonly Note[];
  readonly decisions: readonly Decision[];
}
