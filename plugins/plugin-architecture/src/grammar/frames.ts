import { TONE_NAMES } from '@diagrist/core';
import { arg, attr, id, oneOf, ref, statement, text } from '@diagrist/lang';
import { LEVEL_ELEMENTS, type Level, LOOK_ATTRIBUTES } from './elements.js';
import { gridName, gridNames } from './values.js';

export const grid = statement('grid', {
  doc: 'The named columns from left to right, or the rows from top to bottom. Names with the same prefix before a dot stand close, such as `api.1,api.2`.',
  examples: ['grid cols user,backend.1,backend.2,edge', 'grid rows top,main,data'],
  arguments: [
    arg('axis', oneOf(['cols', 'rows']), '`cols` for the columns, `rows` for the rows.'),
    arg('names', gridNames(), 'The names in order, separated by commas without spaces.'),
  ],
});

export const layer = statement('layer', {
  doc: 'Names a row in a box right of the picture, joined by one bracket for all layers; needs `layout=adaptive`.',
  examples: ['layer business "Business logic"'],
  arguments: [arg('row', gridName(), 'The row it names.'), arg('label', text(), 'Name of the layer.')],
});

export const group = statement('group', {
  doc: 'A frame around elements by responsibility; it grows from its members. Exactly one of `own`, `shared`, `external`. `in` nests it into another group; an empty title draws only the frame.',
  examples: ['group backend "Backend" own team="Kotlin · Team Ausleihe"', 'group api "API" own in backend'],
  arguments: [
    arg('id', id(), 'Id that `in` of elements and groups and the ends of edges use.'),
    arg('title', text(), 'Title in the head of the frame.'),
  ],
  clauses: { in: attr(ref('group'), 'The group whose frame holds this one.') },
  attributes: {
    team: attr(text(), 'Who is responsible; second line of the head, else the role in words.'),
    heading: attr(oneOf(['top', 'side']), '`top` (default) or `side`: title left in the middle, as for layer bands.'),
    tag: attr(text(), 'A tag right in the frame, such as `"CLOSED"` for a closed layer.'),
    cover: attr(gridName(), 'A column the frame also covers, at the height of its members; needs `layout=adaptive`.'),
    tone: attr(oneOf(TONE_NAMES), 'Fills the frame lightly in this tone; in `look=blocks` the colour of its area.'),
  },
  flags: {
    own: 'Our own system: a solid frame on a light area.',
    shared: 'Shared infrastructure: its elements are drawn muted.',
    external: 'Someone else’s system: a dashed frame.',
  },
});

export const style = statement('style', {
  doc: 'Named values for elements, and a tone for edges, so sizes and colours stand in one place. `style=name` applies them where the element or edge sets none.',
  examples: ['style component height=80', 'style store shape=db height=96'],
  arguments: [arg('id', id(), 'Name that `style=` refers to.')],
  attributes: LOOK_ATTRIBUTES,
});

/** `note` of a level; it points at an element the level allows. */
export function noteTable(level: Level) {
  return statement('note', {
    doc: 'A dashed note above an element, with a tip pointing at it. It is no element and no edge.',
    examples: ['note "replaced in Q3" on portal'],
    arguments: [arg('text', text(), 'What the note says.')],
    clauses: { on: attr(ref(...LEVEL_ELEMENTS[level]), 'The element it points at. Required.') },
  });
}
