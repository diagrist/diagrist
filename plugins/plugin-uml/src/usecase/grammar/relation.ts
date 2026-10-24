import { arg, arrow, attr, optionalArg, ref, statement, text } from '@diagrist/lang';
import { implementing, type SpecElement } from '../../spec/catalog.js';
import { USE_CASES } from '../../spec/use-cases.js';
import { multiplicity } from './values.js';

/**
 * The arrows of `rel`, what each one means and the elements of UML it implements. `-->` stands for two relations, so
 * it needs the flag `include` or `extend`, which name their element; the grammar, its diagnostics, the model and the
 * coverage report read this one table.
 */
const RELATION_ARROWS = {
  '--': { meaning: 'association between an actor and a use case', uml: [USE_CASES.association] },
  '-|>': {
    meaning: 'generalization from the special to the general actor or use case, hollow triangle at the general one',
    uml: [USE_CASES.generalization],
  },
  '-->': {
    meaning: 'include or extend between two use cases, dashed with an open head; needs the flag `include` or `extend`',
  },
} as const;

/** An arrow of `rel`. */
export type RelationArrow = keyof typeof RELATION_ARROWS;

type Entry = { readonly meaning: string; readonly uml?: readonly SpecElement[] };
const ENTRIES: readonly (readonly [RelationArrow, Entry])[] = Object.entries(RELATION_ARROWS) as [
  RelationArrow,
  Entry,
][];

const MEANINGS = Object.fromEntries(ENTRIES.map(([a, entry]) => [a, entry.meaning])) as Record<RelationArrow, string>;

const ELEMENTS: Partial<Record<RelationArrow, readonly SpecElement[]>> = Object.fromEntries(
  ENTRIES.flatMap(([a, entry]) => (entry.uml ? [[a, entry.uml]] : [])),
);

const end = () => ref('actor', 'usecase');

export const rel = statement(
  'rel',
  implementing(
    { flags: { include: [USE_CASES.include], extend: [USE_CASES.extend] } },
    {
      doc: 'A relation, read from `from` to `to`. `a -- b` is an association between an actor and a use case, with multiplicities `source=` at `a` and `card=` at `b`. `a -|> b` is a generalization: `a` is a special kind of `b`, both actors or both use cases. `a --> b include` means `a` always includes `b`; `a --> b extend` means `a` extends `b` under the condition `when=` at the extension points `at=` of `b`, shown in a note on the line. Lines run straight from outline to outline.',
      examples: [
        'rel customer -- order source=1 card=0..*',
        'rel regular -|> customer',
        'rel order --> pay include',
        'rel voucher --> order extend when="voucher present" at="before checkout"',
      ],
      arguments: [
        arg('from', end(), 'Actor or use case the relation starts at.'),
        implementing({ values: ELEMENTS }, arg('arrow', arrow(MEANINGS), 'What kind of relation it is.')),
        arg('to', end(), 'Actor or use case the relation points to.'),
        optionalArg('label', text(), 'Name of the relation, shown at the middle of the line.'),
      ],
      attributes: {
        source: implementing(
          { uml: [USE_CASES.multiplicity] },
          attr(multiplicity(), 'Multiplicity at `from`, on an association only.'),
        ),
        card: implementing(
          { uml: [USE_CASES.multiplicity] },
          attr(multiplicity(), 'Multiplicity at `to`, on an association only.'),
        ),
        when: implementing(
          { uml: [USE_CASES.extendCondition, USE_CASES.extendNote] },
          attr(text(), 'Condition of an `extend`, written without braces: Diagrist shows `{condition}` in a note.'),
        ),
        at: implementing(
          { uml: [USE_CASES.extensionPoint, USE_CASES.extendNote] },
          attr(text(), 'Extension points of the extended use case `to`, separated by commas; on an `extend` only.'),
        ),
      },
      flags: {
        include: 'With `-->`: `from` always includes the behaviour of `to` («include»).',
        extend: 'With `-->`: `from` extends `to` under a condition («extend»).',
        emph: 'Highlights the line in the accent colour.',
      },
    },
  ),
);
