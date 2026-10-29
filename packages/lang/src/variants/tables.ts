import { arg, attr, type KindSpec, optionalArg, type StatementSpec, statement } from '../grammar/spec.js';
import { id, ref, text, type Value, word } from '../grammar/value.js';

/** Keywords every kind has besides its own (ADR 0021); a kind may not declare them itself. */
export const SHARED_KEYWORDS: readonly string[] = ['use', 'variant', 'set', 'drop'];

const lineId: Value<string> = {
  ...word(),
  type: 'ref',
  expected: 'the id a line at the top level of the picture declares, such as `db`',
};

const leading: Value<string> = {
  type: 'tokens',
  expected: 'the first words, texts and operators of the line as written, such as `backend -> portal`',
  tokens: ['word', 'text', 'operator'],
  read: (raw) => ({ ok: true, value: raw }),
};

/** `use <file>`: the statements of another file of the same kind, before this file's own. */
export const USE: StatementSpec = statement('use', {
  doc: "Puts the statements and variants of another `.dgr` file of the same kind before this file's own, as if they were written here, so a variant may build on them. The other file's header is not taken. `use` lines stand directly after the header.",
  examples: ['use "radverleih.dgr"'],
  arguments: [
    arg(
      'file',
      text(),
      'Path of the file relative to this one. It stays inside the folder `dgr` runs in and names no hidden file or folder.',
    ),
  ],
});

/** `set <id> ...` inside a variant: changes clauses, attributes and flags of a declared line where it stands. */
export const SET: StatementSpec = statement('set', {
  doc: "Changes the line that declares `id`, where it stands. What follows the id is checked against that line's own table: a clause or attribute written again replaces its value, a flag written turns it on. Arguments such as the label cannot be set: drop the line and declare it again.",
  examples: ['set db tech="PostgreSQL 17"', 'set portal status=deprecated'],
  arguments: [arg('id', lineId, 'The id of the line to change.')],
});

/** `drop <keyword> <arguments>` inside a variant: removes exactly one line. */
export const DROP: StatementSpec = statement('drop', {
  doc: 'Removes one line of the picture: its keyword and as many of its first arguments as make it unique, matched from the left. It must match exactly one line, and no line left may refer to an id it removes. A line declared again after its `drop` takes its place. Lines inside a block are not dropped singly: drop the block and declare it again.',
  examples: ['drop node portal', 'drop edge backend -> portal', 'drop grid rows'],
  arguments: [
    arg('keyword', word(), 'The keyword of the line, such as `node`.'),
    optionalArg('arguments', leading, 'Its first arguments as written, as many as make it unique.'),
  ],
});

/** The `variant` block of a kind: its own statements add lines, `set` and `drop` change and remove them. */
function variantOf(kind: KindSpec): StatementSpec {
  return statement('variant', {
    doc: 'One more picture from the same base, written as the lines that differ: a statement of the kind adds a line, `set` changes one and `drop` removes one. A new line goes before the next line of its keyword the variant declares again, else after the last line of its keyword, so lines keep the order they are written in. `dgr build` writes it as `<file>.<id>.svg`.',
    examples: [
      'variant target "Target 2027" subtitle="For review" diff',
      'variant a "Option A: stream through the backend" from target',
    ],
    arguments: [
      arg('id', id(), 'Id of the variant, part of the file name of its picture.'),
      arg('title', text(), 'Title of its picture, in place of the title of the header.'),
    ],
    clauses: {
      from: attr(ref('variant'), 'A variant declared above to build on; without it the variant builds on the base.'),
    },
    attributes: { subtitle: attr(text(), 'Subtitle of its picture, in place of the one of the header.') },
    flags: {
      diff: 'Draws the picture as a comparison with what it builds on: added, removed and changed lines marked, with a legend. Kinds that cannot draw it report K103.',
    },
    children: [...kind.statements, SET, DROP],
  });
}

/** The statements every kind allows at the top level besides its own, `use` and `variant`, built for `kind`. */
export function sharedStatements(kind: KindSpec): StatementSpec[] {
  return [USE, variantOf(kind)];
}
