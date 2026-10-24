import type { Point, Rect } from '@diagrist/core';
import type { Header, Strip } from '@diagrist/parts';
import type { MessageKind } from '../diagram.js';

/** A named point, such as the anchor of a text. */
export interface Spot {
  readonly x: number;
  readonly y: number;
}

/** A straight segment between two points. */
export interface Segment {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/** Role of an area or line; the scene names it, the style table draws it. */
export type SeqRole =
  | 'head'
  | 'headExternal'
  | 'figure'
  | 'figureExternal'
  | 'stroke'
  | 'strokeExternal'
  | 'lifeline'
  | 'activation'
  | 'frame'
  | 'tag'
  | 'separator'
  | 'ref'
  | 'note'
  | 'destroy'
  | 'knockout'
  | 'dot'
  | 'guide'
  | 'bracket'
  | 'divider'
  | 'state'
  | 'coregion';

/** Role of a text; the scene turns it into a role and a font role of the style table. */
export type SeqTextRole =
  | 'name'
  | 'stereo'
  | 'message'
  | 'messageEmph'
  | 'tag'
  | 'guard'
  | 'note'
  | 'number'
  | 'constraint';

export type SeqShape =
  | { readonly kind: 'rect'; readonly rect: Rect; readonly role: SeqRole; readonly rx?: number }
  | { readonly kind: 'path'; readonly d: string; readonly role: SeqRole }
  | { readonly kind: 'line'; readonly seg: Segment; readonly role: SeqRole }
  | { readonly kind: 'circle'; readonly cx: number; readonly cy: number; readonly r: number; readonly role: SeqRole }
  | {
      readonly kind: 'text';
      readonly at: Spot;
      readonly text: string;
      readonly role: SeqTextRole;
      readonly anchor: 'start' | 'middle' | 'end';
    }
  /** Decision mark such as `E1`, centred on (x, y). */
  | { readonly kind: 'mark'; readonly id: string; readonly x: number; readonly y: number };

/** Head of a lifeline with its outline, for embeddings. */
export interface SeqHeadArt {
  readonly id: string;
  readonly rect: Rect;
  readonly shapes: readonly SeqShape[];
}

/** A message: polyline with the arrowhead at its end, label on a knocked-out ground. */
export interface SeqMessageArt {
  readonly index: number;
  readonly from: string;
  readonly to: string;
  readonly kind: MessageKind;
  readonly emph: boolean;
  readonly points: readonly Point[];
  /** Filled circle at the open end of a lost or found message. */
  readonly ends: readonly SeqShape[];
  readonly label: readonly SeqShape[];
  /** Gate: this end lies on the frame of the interaction; the layout extends it there. */
  readonly gate?: 'start' | 'end';
  /** Gate on the frame of this fragment instead of the frame `sd`. */
  readonly via?: string;
  /** Name of the gate, small below the line at the frame. */
  readonly gateName?: string;
}

/** Everything the scene draws, by layer in drawing order. */
export interface SequenceLayout {
  readonly header: Header;
  readonly width: number;
  readonly height: number;
  readonly lifelines: readonly SeqShape[];
  readonly activations: readonly SeqShape[];
  readonly frames: readonly SeqShape[];
  readonly boxes: readonly SeqShape[];
  /** Outlines of references and notes, for the width of the picture. */
  readonly bounds: readonly Rect[];
  readonly messages: readonly SeqMessageArt[];
  readonly heads: readonly SeqHeadArt[];
  readonly marks: readonly SeqShape[];
  /** Above the lifelines, below the bars: guide lines of time constraints, double lines of dividers. */
  readonly guides: readonly SeqShape[];
  /** On top: brackets and texts of time constraints, text boxes of dividers. */
  readonly annotations: readonly SeqShape[];
  readonly strip: Strip;
}
