/**
 * One thing to draw. Shapes carry a role, not a style (ADR 0008): the plugin's style table turns the role
 * into classes and arrowheads, so looks change tables, never code. Coordinates are picture pixels.
 */
export type Shape =
  | {
      readonly kind: 'rect';
      readonly x: number;
      readonly y: number;
      readonly w: number;
      readonly h: number;
      readonly rx?: number;
      readonly role: string;
    }
  | {
      readonly kind: 'path';
      /** SVG path data, written out unchanged. */
      readonly d: string;
      readonly role: string;
      /** Moves the path by `[dx, dy]`, e.g. a shadow below the shape it copies. */
      readonly offset?: readonly [number, number];
    }
  | {
      readonly kind: 'line';
      readonly x1: number;
      readonly y1: number;
      readonly x2: number;
      readonly y2: number;
      readonly role: string;
    }
  | { readonly kind: 'circle'; readonly cx: number; readonly cy: number; readonly r: number; readonly role: string }
  | {
      readonly kind: 'text';
      readonly x: number;
      readonly y: number;
      readonly text: string;
      readonly role: string;
      /** Font role, a key of `Styles.fonts`: what size and weight the text was measured with. */
      readonly font: string;
      readonly anchor?: 'start' | 'middle' | 'end';
      /**
       * Parts of `text` with roles of their own, such as the tokens of highlighted code (ADR 0025), written as
       * `<tspan>` in one line. Their texts joined are `text` (K104 otherwise), so the placement check, descriptions and
       * tests read one line, and its spaces are kept as written. Measure them with `runsWidth`.
       */
      readonly runs?: readonly TextRun[];
    }
  | {
      readonly kind: 'icon';
      /** A key of `Styles.icons`. */
      readonly icon: string;
      readonly x: number;
      readonly y: number;
      /** Edge length of the square the icon is drawn into. */
      readonly size: number;
      readonly role: string;
    }
  | {
      readonly kind: 'group';
      /** DOM id that embeddings use to find the group, see `domId`. */
      readonly id?: string;
      readonly role?: string;
      readonly children: readonly Shape[];
    };

/** A part of a text line with its own style role; a run without one is written in the role of its text. */
export interface TextRun {
  readonly text: string;
  readonly role?: string;
  /** Font role it was measured with, a key of `Styles.fonts`; the font of its text when left out. */
  readonly font?: string;
}

/** A finished picture: size, accessible title and shapes in drawing order. */
export interface Scene {
  readonly width: number;
  readonly height: number;
  readonly title: string;
  readonly children: readonly Shape[];
}
