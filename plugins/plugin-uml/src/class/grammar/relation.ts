import { arg, arrow, attr, oneOf, optionalArg, ref, statement, text } from '@diagrist/lang';
import { implementing, type SpecElement } from '../../spec/catalog.js';
import { CLASSES } from '../../spec/classes.js';
import { multiplicity } from '../../usecase/grammar/values.js';

/**
 * The arrows of `rel` in a class diagram, what each one means and the elements of UML it implements. Grammar,
 * diagnostics, model, pictures and the coverage report read this one table.
 */
const CLASS_ARROWS = {
  '--': { meaning: 'association, navigability open at both ends', uml: [CLASSES.association] },
  '->': {
    meaning: 'directed association, navigable towards `to` (open head there)',
    uml: [CLASSES.association, CLASSES.navigability],
  },
  '<->': {
    meaning: 'association navigable at both ends (open heads at both)',
    uml: [CLASSES.association, CLASSES.navigability],
  },
  '-->': {
    meaning: 'dependency, dashed with an open head at `to`; between packages with `import` or `access`',
    uml: [CLASSES.dependency],
  },
  '-|>': {
    meaning: 'generalization: `from` is a special kind of `to`, hollow triangle at `to`',
    uml: [CLASSES.generalization],
  },
  '--|>': {
    meaning: 'realization: `from` implements the interface `to`, dashed with a hollow triangle',
    uml: [CLASSES.interfaceRealization],
  },
  'o--': { meaning: 'aggregation: `from` is the whole, hollow diamond at `from`', uml: [CLASSES.aggregation] },
  '*--': {
    meaning: 'composition: `from` is the whole that owns its parts, filled diamond at `from`',
    uml: [CLASSES.composition],
  },
} as const;

/** An arrow of `rel` in a class diagram. */
export type ClassArrow = keyof typeof CLASS_ARROWS;

type Entry = { readonly meaning: string; readonly uml: readonly SpecElement[] };
const ENTRIES = Object.entries(CLASS_ARROWS) as [ClassArrow, Entry][];
const MEANINGS = Object.fromEntries(ENTRIES.map(([a, e]) => [a, e.meaning])) as Record<ClassArrow, string>;
const ELEMENTS = Object.fromEntries(ENTRIES.map(([a, e]) => [a, e.uml])) as Record<ClassArrow, readonly SpecElement[]>;

const end = () => ref('class', 'interface', 'enum', 'assoc', 'package');

export const classRel = statement(
  'rel',
  implementing(
    { flags: { import: [CLASSES.packageImport], access: [CLASSES.packageImport] } },
    {
      doc: 'A relation between classifiers, read from `from` to `to`; the arrow says which (see the arrows). `card=` and `role=` stand at `to`, `source=` and `srole=` at `from`. Generalizations and realizations with the same target share one triangle. A relation of a class with itself is a loop. A leg of an n-ary association runs from the `assoc` to a class.',
      examples: [
        'rel customer -- order "places" source=1 card=0..*',
        'rel order *-- item source=1 card=1..*',
        'rel invoice -|> document',
        'rel repo --|> port',
        'rel student -- course "takes" source=* card=* class=enrolment',
        'rel web --> domain import',
      ],
      arguments: [
        arg('from', end(), 'Classifier, n-ary association or package the relation starts at.'),
        implementing({ values: ELEMENTS }, arg('arrow', arrow(MEANINGS), 'What kind of relation it is.')),
        arg('to', end(), 'Classifier, n-ary association or package the relation points to.'),
        optionalArg('label', text(), 'Name of the relation, shown at the middle of the line.'),
      ],
      attributes: {
        source: implementing(
          { uml: [CLASSES.multiplicity] },
          attr(multiplicity(), 'Multiplicity at `from`: how many `from` belong to one `to`.'),
        ),
        card: implementing(
          { uml: [CLASSES.multiplicity] },
          attr(multiplicity(), 'Multiplicity at `to`: how many `to` belong to one `from`.'),
        ),
        role: implementing(
          { uml: [CLASSES.roleName] },
          attr(text(), 'Role name at `to`, written opposite the multiplicity.'),
        ),
        srole: implementing({ uml: [CLASSES.roleName] }, attr(text(), 'Role name at `from`.')),
        nonav: implementing(
          { uml: [CLASSES.nonNavigable] },
          attr(
            oneOf(['from', 'to', 'both']),
            'Ends that are not navigable: a small x shortly before the end. Only on associations, never at an end with an arrowhead.',
          ),
        ),
        class: implementing(
          { uml: [CLASSES.associationClass] },
          attr(
            ref('class'),
            'The association class: a class that is this association too, joined dashed to the middle of the line and placed below it.',
          ),
        ),
      },
      flags: {
        import: 'A package import `«import»` on a dependency `-->`.',
        access: 'A private package import `«access»` on a dependency `-->`.',
        emph: 'Highlights the line in the accent colour.',
      },
    },
  ),
);
