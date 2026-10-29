import { arg, attr, type Infer, id, oneOf, statement, text } from '@diagrist/lang';
import { ENDS, HEADS, LINES, type LinkDecl, type Origin, SHAPES, type TypeDecl } from './declarations.js';
import { typeList } from './values.js';

const german = attr(
  text(),
  'Its name in German, for pictures with `locale=de`; without it the label stands in every locale.',
);

/** The table of `type`, which vocabularies and concept pictures declare alike. */
export const typeStatement = statement('type', {
  doc: 'A type of thing the picture shows, such as a role, a task or a document. Every item names its type with `is`, and the legend shows each type in use with its shape.',
  examples: ['type rolle "Rolle" shape=person', 'type term "Term" de="Begriff" explain'],
  arguments: [
    arg('id', id(), 'Id that `is` of the items and `from=` and `to=` of the links name.'),
    arg('label', text(), 'Name of the type in the legend.'),
  ],
  attributes: {
    shape: attr(
      oneOf(SHAPES),
      'How its items are drawn: `box` (default), `round` corners, `person` with a figure, `store` as a cylinder, `doc` with a folded corner.',
    ),
    de: german,
  },
  flags: { explain: 'Every item of the type has at least one indented entry, such as a definition.' },
});

/** The table of `link`, which vocabularies and concept pictures declare alike. */
export const linkStatement = statement('link', {
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
    de: german,
  },
  flags: {
    acyclic: 'No chain of such relations leads back to where it started.',
    upward: 'The second item stands above the first, as a broader term above a narrower one or a lead above a team.',
    beside:
      'The two items stand side by side rather than one below the other, as a deputy beside the role it stands in for.',
    bare: 'The line carries no label of the link, since its look tells it apart; the legend names it.',
  },
});

type TypeLine = Infer<typeof typeStatement>;
type LinkLine = Infer<typeof linkStatement>;

const labelOf = (s: TypeLine | LinkLine) => ({ en: s.label, de: s.attributes.de ?? s.label });

/** A declared type from its line, coming from `origin`. */
export const typeOf = (s: TypeLine, origin: Origin): TypeDecl => ({
  id: s.id,
  label: labelOf(s),
  shape: s.attributes.shape ?? 'box',
  explain: s.flags.explain,
  origin,
});

/** A declared link from its line, coming from `origin`. */
export const linkOf = (s: LinkLine, origin: Origin): LinkDecl => ({
  id: s.id,
  label: labelOf(s),
  from: s.attributes.from ?? [],
  to: s.attributes.to ?? [],
  line: s.attributes.line ?? 'solid',
  head: s.attributes.head ?? 'arrow',
  ...(s.attributes.each === undefined ? {} : { each: s.attributes.each }),
  ...(s.attributes.single === undefined ? {} : { single: s.attributes.single }),
  acyclic: s.flags.acyclic,
  upward: s.flags.upward,
  beside: s.flags.beside,
  bare: s.flags.bare,
  origin,
});
