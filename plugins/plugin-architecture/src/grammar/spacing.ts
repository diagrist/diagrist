import { attr, oneOf, statement } from '@diagrist/lang';
import { whole } from './values.js';

/** The coarse levels of room in a picture, as `spacing=` takes them; `normal` is the room every picture had so far. */
export const SPACING_LEVELS = ['compact', 'normal', 'loose'] as const;

/** `spacing=` in the header: one word for how close everything stands. */
export const spacingAttribute = attr(
  oneOf(SPACING_LEVELS),
  'How close everything stands: `compact` with about 0.7 of the usual room, `normal` (default), `loose` with about 1.4 times. The statement `spacing` sets single measures on top of it.',
);

/** The statement `spacing`: single measures in pixels, each overriding what the level of `spacing=` gives it. */
export const spacing = statement('spacing', {
  doc: 'Sets single measures of room in pixels, over what `spacing=` in the header gives. `ring`, `gap` and `label` shape `layout=star`; `cols` and `rows` the grid; `margin` both.',
  examples: ['spacing ring=120 gap=56', 'spacing label=10 margin=64', 'spacing cols=96 rows=80'],
  arguments: [],
  attributes: {
    ring: attr(
      whole(16, 960),
      'With `layout=star`: the shortest way from the outline of the middle element to its neighbours, so every line is at least this long.',
    ),
    gap: attr(whole(8, 480), 'With `layout=star`: the least room between two neighbours on the ring.'),
    label: attr(whole(2, 64), 'With `layout=star`: how far the text of an edge stands from its line.'),
    margin: attr(whole(0, 480), 'The room left and right of the picture.'),
    cols: attr(whole(16, 960), 'In the grid: the room between two columns.'),
    rows: attr(whole(16, 960), 'In the grid: the room between two rows.'),
  },
});
