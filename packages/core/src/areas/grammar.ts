import { type Arg, type Attr, arg, attr, id, oneOf, ref, type StatementSpec, statement, text } from '@diagrist/lang';
import { AREA_PAINTS, AREA_TONE_NAMES, type AreaPaint, type AreaTone } from './tones.js';

/** The table of `area`, typed so that `Infer` reads its id, label and tone. */
export type AreaStatementSpec = StatementSpec<'area'> & {
  readonly arguments: readonly [Arg<'id', string, false>, Arg<'label', string, false>];
  readonly clauses: Record<never, never>;
  readonly attributes: { readonly tone: Attr<AreaTone> };
  readonly flags: { readonly core: string };
};

/**
 * `area <id> <label> [tone=]`, a statement every kind may put into its table (ADR 0033): a named part of the
 * picture, such as the core or one extension of an extensible architecture, that elements, frames and lines join.
 */
export const AREA_STATEMENT: AreaStatementSpec = statement('area', {
  doc: 'A named area of the picture, such as the core or one extension of an extensible architecture. Elements, frames and lines join it with `area=` and are painted in its tone, and the legend names it. An area without a tone stays in ink, as a core does.',
  examples: ['area kern "Kern"', 'area zahlung "Zahlungen" tone=green', 'area basis "Plattform" tone=sky core'],
  arguments: [
    arg('id', id(), 'Id that `area=` of elements, frames and lines names.'),
    arg('label', text(), 'Name of the area in the legend.'),
  ],
  attributes: {
    tone: attr(
      oneOf(AREA_TONE_NAMES),
      'Colour of the area. Two areas of one picture take different tones; without one the area stays in ink.',
    ),
  },
  flags: {
    core: 'The core the other areas extend. A picture that arranges a core and its extensions lays it out first and docks the others at its sides; without the flag, the one area without a tone is the core.',
  },
}) as AreaStatementSpec;

/** `area=` on an element or a frame: the area it belongs to. Members of a frame take its area unless they name one. */
export const areaAttribute: Attr<string> = attr(
  ref('area'),
  'The area it belongs to, declared with `area`, whose tone paints it. Members of a frame take the area of the frame unless they name their own.',
);

/** `area=` on a line: the area it belongs to, else the area of its first end, else that of its second. */
export const lineAreaAttribute: Attr<string> = attr(
  ref('area'),
  'The area the line belongs to, declared with `area`. Without it the line takes the coloured area of its first end, else that of its second, so a line between an extension and the core belongs to the extension.',
);

/** `areas=` in the header: how the elements of coloured areas are painted. */
export const areasAttribute: Attr<AreaPaint> = attr(
  oneOf(AREA_PAINTS),
  'How elements of a coloured area are painted: `tint` (default) a light fill and the outline in its tone, `outline` the outline and the name in its tone, `stripe` a stripe of its tone at the left edge. Lines and frames of an area are drawn in its tone in each.',
);
