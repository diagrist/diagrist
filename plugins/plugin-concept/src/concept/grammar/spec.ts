import { localeAttribute } from '@diagrist/core';
import { arg, attr, type Infer, id, kind, lines, oneOf, optionalArg, ref, statement, text } from '@diagrist/lang';
import { ENDS, HEADS, LINES, SHAPES } from '../declarations.js';
import { VOCABULARY_NAMES } from '../vocabularies.js';
import { declared, typeList } from './values.js';

const type = statement('type', {
  doc: 'A type of thing the picture shows, such as a role, a task or a document. Every item names its type with `is`, and the legend shows each type in use with its shape.',
  examples: ['type rolle "Rolle" shape=person', 'type begriff "Begriff" explain'],
  arguments: [
    arg('id', id(), 'Id that `is` of the items and `from=` and `to=` of the links name.'),
    arg('label', text(), 'Name of the type in the legend.'),
  ],
  attributes: {
    shape: attr(
      oneOf(SHAPES),
      'How its items are drawn: `box` (default), `round` corners, `person` with a figure, `store` as a cylinder, `doc` with a folded corner.',
    ),
  },
  flags: { explain: 'Every item of the type has at least one indented entry, such as a definition.' },
});

const link = statement('link', {
  doc: 'A type of relation between items of the types it lists. Every relation names its link, and the declared rules are checked: which types it joins, how many relations each item needs, and whether chains may loop.',
  examples: [
    'link fuehrt "führt aus" from=rolle to=aufgabe each=to',
    'link teil "ist Teil von" from=begriff to=begriff head=diamond acyclic bare',
  ],
  arguments: [
    arg('id', id(), 'Id that the relations name between their two items.'),
    arg(
      'label',
      text(),
      'What the relation says, read from the first item to the second; on the line and in the legend.',
    ),
  ],
  attributes: {
    from: attr(typeList(), 'The types of the item a relation starts at.'),
    to: attr(typeList(), 'The types of the item a relation ends at.'),
    line: attr(oneOf(LINES), 'How the line is drawn: `solid` (default), `dashed` or `dotted`.'),
    head: attr(
      oneOf(HEADS),
      'The head at the second item: `arrow` (default), `open`, `triangle` and `diamond` hollow, or `none`.',
    ),
    each: attr(oneOf(ENDS), 'Every item of a `from` type, of a `to` type, or of both, has at least one such relation.'),
    single: attr(
      oneOf(ENDS),
      'Every item of a `from` type, of a `to` type, or of both, has at most one such relation.',
    ),
  },
  flags: {
    acyclic: 'No chain of such relations leads back to where it started.',
    upward: 'The second item stands above the first, as a broader term above a narrower one or a lead above a team.',
    beside:
      'The two items stand side by side rather than one below the other, as a deputy beside the role it stands in for.',
    bare: 'The line carries no label of the link, since its look tells it apart; the legend names it.',
  },
});

const entry = lines({
  doc: 'An entry of the item, such as a definition or a detail, drawn below its name.',
  examples: ['"Vertrag über die Miete eines Rads für eine Zeit"'],
  arguments: [arg('text', text(), 'What the entry says.')],
});

const item = statement('item', {
  doc: 'One thing of a declared type. Its indented lines are entries drawn below its name.',
  examples: ['item kunde "Kunde" is rolle', 'item tarif "Tarif" is begriff status=deprecated'],
  arguments: [arg('id', id(), 'Id that the relations name.'), arg('label', text(), 'Name of the item in its shape.')],
  clauses: { is: attr(declared('type'), 'Its type, declared with `type` or by the vocabulary.') },
  attributes: {
    status: attr(
      oneOf(['planned', 'deprecated']),
      'An item not there yet, drawn dashed, or one to give up, drawn dashed and muted.',
    ),
  },
  lines: entry,
});

const rel = statement('rel', {
  doc: 'One relation of a declared link from one item to another, written as a sentence: `rel kunde fuehrt ausleihen`.',
  examples: ['rel kunde fuehrt ausleihen', 'rel ausleihen erzeugt vertrag "bei Abschluss"'],
  arguments: [
    arg('from', ref('item'), 'The item the relation starts at.'),
    arg('link', declared('link'), 'Its link, declared with `link` or by the vocabulary.'),
    arg('to', ref('item'), 'The item the relation ends at.'),
    optionalArg('label', text(), 'Its own text on the line, instead of the label of the link.'),
  ],
});

const statements = [type, link, item, rel] as const;

/** The statement tables of concept pictures. */
export const conceptSpec = kind('concept', {
  doc: 'A picture of a business concept with its own vocabulary: the file declares types of things and types of relations with their rules, then writes items and relations, which are checked against the declarations. A vocabulary of the plugin brings the declarations of a common picture, such as `terms` or `roles`.',
  header: {
    subtitle: attr(text(), 'Second line below the title.'),
    vocabulary: attr(
      oneOf(VOCABULARY_NAMES),
      'Declarations of the plugin the file builds on: `terms` (terms with definitions, broader and narrower, parts, synonyms) or `roles` (roles, who reports to whom, who stands in for whom).',
    ),
    locale: localeAttribute,
  },
  statements,
});

/** Typed value of a top-level statement, derived from the tables (ADR 0004). */
export type ConceptStatement = Infer<(typeof statements)[number]>;
