import type { Span } from '@diagrist/lang';
import type { GridLayout } from '@diagrist/layout-grid';
import type { StateModel } from '../model.js';

/** The ends of a transition by route index, whether it is highlighted, and the area it names itself (ADR 0033). */
export interface TransitionEnds {
  readonly from: string;
  readonly to: string;
  readonly emph?: boolean;
  readonly area?: string;
  /** The source line of the transition, for the anchors. */
  readonly span?: Span;
}

/** What the rest of the kind knows per route index: its ends, the lines of its label, and the layout. */
export interface RouteContext {
  readonly m: StateModel;
  readonly grid: GridLayout;
  readonly ends: readonly TransitionEnds[];
  readonly lines: readonly (readonly string[])[];
}
