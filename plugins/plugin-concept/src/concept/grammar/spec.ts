import { localeAttribute } from '@diagrist/core';
import { arg, attr, file, type Infer, id, kind, lines, oneOf, optionalArg, ref, statement, text } from '@diagrist/lang';
import { linkStatement, typeStatement } from '../../shared/declare.js';
import { declared } from '../../shared/values.js';
import { VOCABULARY_NAMES } from '../../shared/vocabularies.js';

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

const statements = [typeStatement, linkStatement, item, rel] as const;

/** The statement tables of concept pictures. */
export const conceptSpec = kind('concept', {
  doc: 'A picture of a business concept with its own vocabulary: the file declares types of things and types of relations with their rules, then writes items and relations, which are checked against the declarations. A vocabulary file named with `use=`, or one of the plugin such as `terms` or `roles`, brings the declarations of a subject.',
  header: {
    subtitle: attr(text(), 'Second line below the title.'),
    vocabulary: attr(
      oneOf(VOCABULARY_NAMES),
      'Declarations of the plugin the file builds on: `terms` (terms with definitions, broader and narrower, parts, synonyms) or `roles` (roles, who reports to whom, who stands in for whom).',
    ),
    arrange: attr(
      oneOf(['columns', 'layers']),
      'How the items stand: `columns`, a column per type in the order of their declaration, so a relation reads from left to right as a sentence; or `layers` along the relations. Without it, columns when the items are of more than one type.',
    ),
    use: attr(
      file(),
      'A vocabulary file the picture builds on, such as `"iks.vocab.dgr"`: its types and links come first, after those of `vocabulary=`.',
    ),
    locale: localeAttribute,
  },
  statements,
});

/** Typed value of a top-level statement, derived from the tables (ADR 0004). */
export type ConceptStatement = Infer<(typeof statements)[number]>;
