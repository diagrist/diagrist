import { TONE_NAMES } from '@diagrist/core';
import { arg, attr, id, lines, oneOf, optionalArg, ref, statement, text } from '@diagrist/lang';
import { implementing, type SpecElement } from '../../spec/catalog.js';
import { CLASSES } from '../../spec/classes.js';

const tone = (what: string) => attr(oneOf(TONE_NAMES), `Colour of ${what} in \`look=cards\`; without it slate.`);
const mark = attr(ref('adr'), 'Id of a decision of the decision bar, such as `E1`; the mark is drawn beside it.');

/** A member as a UML text (ADR 0003): visibility, name, and for operations the parameters and return type. */
const member = lines(
  implementing(
    {
      uml: [CLASSES.attribute, CLASSES.operation],
      flags: { static: [CLASSES.staticFeature], abstract: [CLASSES.abstractOperation] },
    },
    {
      doc: 'A member of the classifier as a UML text in double quotes, one per line: an attribute `"- name : Type"` or an operation `"+ total(tax : Rate) : Money"`. Visibility (`+ - # ~`) and the operation (by its parenthesis) are read from the text, as are multiplicities and properties such as `[1..*]` and `{readOnly}`. In an `enum` each line is a value. Members never wrap; the box grows to the widest one.',
      examples: ['"- name : String"', '"+ total() : Money" abstract'],
      arguments: [arg('text', text(), 'The member as UML writes it, such as `"- iban : String {readOnly}"`.')],
      flags: {
        static: 'A member of the class, not of its instances: drawn underlined.',
        abstract: 'An operation without implementation: drawn in italics. Only in abstract classes and interfaces.',
      },
    },
  ),
);

/** One statement per classifier kind; they share arguments, attributes, flags and the member lines. */
function classifier<const K extends string>(
  keyword: K,
  uml: readonly SpecElement[],
  what: string,
  example: readonly string[],
) {
  return statement(
    keyword,
    implementing(
      { uml, flags: { abstract: [CLASSES.abstractClassifier] } },
      {
        doc: `${what} Members follow indented, one per line. Diagrist places classifiers in layers: superclasses and interfaces above, the whole above its parts, the user above what it uses, associated classes side by side.`,
        examples: example,
        arguments: [
          arg('id', id(), 'Id that `rel`, `note` and `class=` use for this classifier.'),
          arg('label', text(), 'Name shown in the box.'),
        ],
        clauses: { in: attr(ref('package'), 'The package the classifier belongs to.') },
        attributes: {
          stereotype: attr(text(), 'Stereotype above the name, written without guillemets: `entity` shows `«entity»`.'),
          template: implementing(
            { uml: [CLASSES.templateParameter] },
            attr(
              text(),
              'Template parameters such as `"T"` or `"K, V"`, drawn in a dashed box at the top right corner.',
            ),
          ),
          tone: tone('the name field'),
          mark,
        },
        flags: {
          abstract: 'An abstract classifier: the name in italics with `{abstract}` below it.',
          emph: 'Highlights the box in the accent colour.',
        },
        lines: member,
      },
    ),
  );
}

export const classStatement = classifier(
  'class',
  [CLASSES.class],
  'A class: a box with the name, below it the compartments of attributes and operations, shown even when empty.',
  ['class order "Order" stereotype="entity"\n  "- number : String {readOnly}"\n  "+ total() : Money"'],
);

export const interfaceStatement = classifier(
  'interface',
  [CLASSES.interface],
  'An interface: `«interface»` above the name, operations in italics; the attribute compartment only when it holds something.',
  ['interface printable "Printable"\n  "+ print() : String"'],
);

export const enumStatement = classifier(
  'enum',
  [CLASSES.enumeration],
  'An enumeration: `«enumeration»` above the name, below it one value per line.',
  ['enum status "Status"\n  "OPEN"\n  "PAID"'],
);

export const packageStatement = statement(
  'package',
  implementing(
    { uml: [CLASSES.package] },
    {
      doc: 'A package: a frame with a tab holding the name, around the classifiers `in` it. Packages nest with `in`. Between packages, and between a package and a classifier, only dependencies `-->` exist, optionally with `import` or `access`. A package without classifiers is not drawn.',
      examples: ['package domain "domain"', 'package persistence "persistence" in backend'],
      arguments: [
        arg('id', id(), 'Id that `in`, `rel` and `note` use for this package.'),
        arg('label', text(), 'Name shown in the tab.'),
      ],
      clauses: { in: attr(ref('package'), 'The package this one is nested in.') },
      attributes: { tone: tone('its area') },
    },
  ),
);

export const assocStatement = statement(
  'assoc',
  implementing(
    { uml: [CLASSES.naryAssociation] },
    {
      doc: 'An n-ary association: a diamond joined to three or more classes. Each end is a leg `rel <assoc> -- <class> card=... role=...`; multiplicity and role stand at the class end and say how many objects there belong to one fixed combination of the other ends. The name stands at the top right of the diamond. Diagrist places the diamond in the middle of its ends: the first two left and right, the third below, the fourth (or the association class) above.',
      examples: ['assoc lesson "Lesson" class=unit'],
      arguments: [
        arg('id', id(), 'Id that the legs `rel <id> -- <class>` use.'),
        optionalArg('label', text(), 'Name of the association, shown at the top right of the diamond.'),
      ],
      clauses: { in: attr(ref('package'), 'The package the association belongs to.') },
      attributes: {
        class: implementing(
          { uml: [CLASSES.associationClass] },
          attr(ref('class'), 'The association class: a class that is this association, joined dashed to the diamond.'),
        ),
        mark,
      },
      flags: { emph: 'Highlights the diamond in the accent colour.' },
    },
  ),
);

export const classNote = statement(
  'note',
  implementing(
    { uml: [CLASSES.comment] },
    {
      doc: 'A comment on a classifier: a dashed box above it with a tip down to it, below it when lines run above.',
      examples: ['note "Exactly one lecturer per lesson" on lecturer'],
      arguments: [arg('text', text(), 'What the note says, in one line.')],
      clauses: { on: attr(ref('class', 'interface', 'enum'), 'The classifier the note belongs to. Required.') },
    },
  ),
);
