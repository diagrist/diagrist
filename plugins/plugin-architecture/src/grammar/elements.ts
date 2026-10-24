import { TONE_NAMES } from '@diagrist/core';
import { arg, attr, id, oneOf, ref, statement, text } from '@diagrist/lang';
import { ICON_NAMES } from '../icons/index.js';
import { place, slot, spanEnd, whole } from './values.js';

/** The C4 levels this plugin draws, one kind each. */
export type Level = 'context' | 'container' | 'component';

/** What each element keyword is, for its doc. */
const ELEMENTS = {
  person: {
    what: 'A person who uses the system, drawn as a stick figure with name and role below it.',
    example: 'person customer "Customer" tech="account holder" at user/main',
  },
  system: {
    what: 'A software system, as a box with name and a second line.',
    example: 'system shop "Web shop" tech="sells online" at core/main emph mark=E1',
  },
  container: {
    what: 'A container: an application or data store that runs on its own, such as a service or a database.',
    example: 'container db "Database" tech="PostgreSQL" icon=postgresql at infra/data in infra',
  },
  component: {
    what: 'A component inside a container, such as a module or an adapter.',
    example: 'component api "REST API" tech="Spring Boot" icon=springboot at backend.2/main in backend',
  },
  node: {
    what: 'A neutral element for any level, such as a queue, a job or a layer of a pattern.',
    example: 'node orders "Orders" tech="business logic" replicas=3 at web/business in cloud',
  },
} as const;

/** A keyword that declares an element, such as `system`. */
export type ElementKeyword = keyof typeof ELEMENTS;

/**
 * Which elements each level allows (the predecessor warned with W110, now the tables say it): a context shows
 * systems and people, a container diagram containers, a component diagram components inside a container.
 */
export const LEVEL_ELEMENTS: Readonly<Record<Level, readonly ElementKeyword[]>> = {
  context: ['person', 'system', 'node'],
  container: ['person', 'system', 'container', 'node'],
  component: ['person', 'container', 'component', 'node'],
};

/** Forms a node takes: `db` cylinder, `queue` tube, `store` folded sheet, `job` clock, `app` window. */
export const SHAPES = ['db', 'queue', 'store', 'job', 'app'] as const;

/** Life cycle marks: planned parts are dashed, deprecated ones grey. */
export const STATUSES = ['planned', 'deprecated'] as const;

/** Forms of a node in the looks: `card` and `circle` in `look=cards`, `text` without a box in `look=blocks`. */
export const FORMS = ['card', 'circle', 'text'] as const;

/** The attributes nodes and `style` share, so a style sets what a node may set itself. */
export const LOOK_ATTRIBUTES = {
  icon: attr(oneOf(ICON_NAMES), 'Pictogram before the name: the technology or the role of the element.'),
  shape: attr(oneOf(SHAPES), 'Form of the box: `db` cylinder, `queue` tube, `store` folded sheet, `job`, `app`.'),
  width: attr(whole(48, 960), 'Width of the box in pixels; needs `layout=adaptive`.'),
  height: attr(whole(24, 480), 'Height of the box in pixels; needs `layout=adaptive`.'),
  tone: attr(oneOf(TONE_NAMES), 'Colour of the icon circle in `look=cards` and of the block in `look=blocks`.'),
  form: attr(oneOf(FORMS), '`card` or `circle` in `look=cards`; `text` draws only the name in `look=blocks`.'),
};

/** The statement of one element keyword; every level that allows it shares this table. */
function element<const K extends ElementKeyword>(keyword: K) {
  return statement(keyword, {
    doc: `${ELEMENTS[keyword].what} \`at\` places it in the grid, \`in\` puts it into a group. \`emph\` marks a core decision with a thick border.`,
    examples: [ELEMENTS[keyword].example],
    arguments: [
      arg('id', id(), 'Id that edges, flows, notes and `in` use for this element.'),
      arg('label', text(), 'Name in the picture.'),
    ],
    clauses: {
      at: attr(place(), 'Place in the grid as `column/row`. Required.'),
      in: attr(ref('group'), 'The group whose frame holds the element.'),
    },
    attributes: {
      tech: attr(text(), 'Second line: technology or role, such as `"PostgreSQL"`.'),
      ...LOOK_ATTRIBUTES,
      status: attr(oneOf(STATUSES), '`planned` draws the box dashed, `deprecated` grey; both name it beside `tech`.'),
      replicas: attr(whole(2, 99), 'Number of instances from 2, shown as `x3` in the corner.'),
      span: attr(spanEnd(), 'Last column, or `column/row`, of the area the element covers; needs `layout=adaptive`.'),
      slot: attr(slot(), 'Takes place `i` of `n` equal places in its area, like `2/3`; needs `layout=adaptive`.'),
      style: attr(ref('style'), 'A `style` whose values apply where the element sets none.'),
      mark: attr(ref('adr'), 'Id of a decision of the bar below, such as `E1`; the mark stands at the corner.'),
    },
    flags: { emph: 'Draws the border thick: the core decision of the picture.' },
  });
}

export const person = element('person');
export const system = element('system');
export const container = element('container');
export const component = element('component');
export const node = element('node');

/** The element tables by keyword. */
export const ELEMENT_TABLES = { person, system, container, component, node } as const;
