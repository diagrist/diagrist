import type { Font, Marker, RoleStyle, StyleRule } from '@diagrist/core';
import type { FontRole, Metrics } from '../layout/metrics.js';
import type { Strokes } from '../styles/rules.js';

/** A font of a look: the kernel's font, and whether texts of the role are set in capitals, as tracked small caps. */
export interface LookFont extends Font {
  readonly caps?: boolean;
}

/** The fonts of a look by role: the layout measures with them, the stylesheet sets them (ADR 0022). */
export type LookFonts = Readonly<Record<FontRole, LookFont>>;

/**
 * The named choices of a look (ADR 0023). Each value is drawn by one piece of code, which every look that picks it
 * shares; the layout and the scene read these, never the name of a look.
 */
export interface LookOptions {
  /** `Kind · Title` in one line, or the kind as a kicker in capitals above the title. */
  readonly header: 'inline' | 'kicker';
  /** The family of node art: outlined boxes, cards with an icon circle on the top edge, filled blocks. */
  readonly nodes: 'box' | 'card' | 'block';
  /** A stick figure, or head and shoulders. */
  readonly person: 'figure' | 'bust';
  /** Status as an italic word after the second line and a dashed or grey box, or as a dot after the name. */
  readonly status: 'word' | 'dot';
  readonly groups: {
    /**
     * `frame`: a rounded outline, title and team always written. `area`: zones with square corners, texts only where
     * given, and the own system an area that texts on it take the colour of. `panel`: an opaque filled area.
     */
    readonly form: 'frame' | 'area' | 'panel';
    /** Title at the top left corner, standing on the frame line, or centred at the top. */
    readonly head: 'corner' | 'onLine' | 'centre';
  };
  readonly edgeText: {
    /** Texts beside their line, or standing on it. */
    readonly place: 'beside' | 'onLine';
    /** The name on the longest horizontal segment (`preferFlat` of `layout-grid`). */
    readonly flat: boolean;
    /** What cuts the line behind a text: a halo stroke in the colour of the ground, or a rectangle of it. */
    readonly ground: 'halo' | 'gap';
  };
  readonly numbers: {
    /** Flow numbers where the layout puts them, or moved along their segment clear of the texts on the line. */
    readonly seat: 'free' | 'seated';
    /** Drawn as `(3)` on a rounded plate, or as the digit in a small disc. */
    readonly form: 'plate' | 'disc';
  };
  /** Decision marks at nodes outside the top right corner, or inside it, where the box keeps room for them. */
  readonly marks: 'aside' | 'inside';
  /** Layers right of the picture as boxes with arrows, or as a fine bracket with their names in the group font. */
  readonly layers: 'boxes' | 'bracket';
  /** Rows of samples below the decision bar, sentences under a hairline, or none. */
  readonly legend: 'strip' | 'sentence' | 'none';
  /** Decisions as cards in a bar below the picture, or as notes in the right margin. */
  readonly decisions: 'bar' | 'notes';
}

/** The paint of a look: strokes, and what it lays over the C4 roles and rules of the standard look. */
export interface Paint {
  readonly strokes: Strokes;
  /** Roles the look maps to other classes than `ARCHITECTURE_ROLES`; a role named here wins. */
  readonly roles: Readonly<Record<string, RoleStyle>>;
  /** Rules of the look: one with the name of a standard rule replaces it in place, the others follow in order. */
  readonly rules: (fonts: LookFonts, strokes: Strokes) => readonly StyleRule[];
  /**
   * The rules of a diff picture (ADR 0021), which every look must give: added and removed boxes and lines, and the
   * tags of added, removed and changed elements with their texts.
   */
  readonly changes: (fonts: LookFonts, strokes: Strokes) => readonly StyleRule[];
  /** The font role whose family and size the root of the stylesheet takes, inherited by texts without their own. */
  readonly root: FontRole;
  readonly fontKerning?: 'none';
  readonly canvas?: string;
  readonly markers?: readonly Marker[];
  /** Only rules a picture uses reach its stylesheet, also those the standard look writes always (ADR 0008 Nr. 5). */
  readonly usedOnly?: boolean;
}

/** A look of C4 pictures as a value (ADR 0023): a one-line doc, measures, fonts by role, paint and options. */
export interface Look {
  /** What the look draws, after its name in the doc of `look=`, the language pages and the skill (ADR 0004). */
  readonly doc: string;
  readonly metrics: Metrics;
  readonly fonts: LookFonts;
  readonly paint: Paint;
  readonly options: LookOptions;
}

/** A text as a font of the look sets it: in capitals when the font says so, measured and drawn alike. */
export const cased = (text: string, font: LookFont): string => (font.caps === true ? text.toUpperCase() : text);
