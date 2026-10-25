import { CODE_LANGUAGES } from '@diagrist/code';
import { localeAttribute } from '@diagrist/core';
import {
  arg,
  arrow,
  attr,
  file,
  type Infer,
  id,
  kind,
  number,
  oneOf,
  optionalArg,
  ref,
  statement,
  text,
  word,
} from '@diagrist/lang';
import { lineRange } from './values.js';

const mark = statement('mark', {
  doc: 'Marks lines of the card with a band and a number, counted across the picture; the note stands under that number below the card. The lines are numbered as in the file, so they must be lines the card shows.',
  examples: ['mark 27-30 "A second call with the same key returns the first transfer"', 'mark 34'],
  arguments: [
    arg('range', lineRange(), 'A line or a range of lines in the numbers of the file, like `31` or `27-30`.'),
    optionalArg(
      'note',
      text(),
      'What these lines do and why, listed below the card. Without it only the band and the number show.',
    ),
  ],
});

const source = statement('source', {
  doc: 'A card of highlighted code read from a file when the picture is built, so it shows the code as it is now and the build fails when the code it points to is gone. `symbol` (a declaration by name) follows the code when lines move and is the first choice, `region` (between `#region` comments) the second, `lines` the last; without any of them the card shows the whole file. Cards stand one below the other in the order of the diagram; the lines keep the numbers of the source file.',
  examples: [
    'source submit "TransferService.submit" src="TransferService.java" symbol=submit',
    'source publish "Outbox.publish" src="Outbox.java" region=publish',
    'source table "outbox_entry" src="outbox.sql" lines=2-9',
    'source api "TransferService" src="TransferService.java" outline',
  ],
  arguments: [
    arg('id', id(), 'Id of the card, which `link` names.'),
    arg('title', text(), 'Caption in the head of the card, such as the class and the method.'),
  ],
  attributes: {
    src: attr(file(), 'The source file, a path in double quotes relative to the diagram. Required.'),
    symbol: attr(
      word(),
      'Only the declaration of this method or type (Java, Kotlin): the annotations and the comment right above it, then everything to its closing brace. A call of the name does not count.',
    ),
    region: attr(
      word(),
      'Only the lines between `#region <name>` and `#endregion` comments in the file, in the comment syntax of its language (`// #region publish`, `-- #region find`, `<!-- #region deps -->`), without the markers.',
    ),
    lines: attr(lineRange(), 'Only this range of lines, like `25-36`. Drifts when lines are added above it.'),
    lang: attr(
      oneOf(CODE_LANGUAGES),
      'Language of the code. Default: from the extension of `src` (`.java`, `.kt`, `.kts`, `.sql`, `.yaml`, `.yml`, `.json`, `.xml`, `.xsd`), else `text`, which draws the code without colours.',
    ),
  },
  flags: {
    outline:
      'Zooms out: declarations, fields, annotations and member signatures, each member body folded into `{ … }`; package, imports, comments and blank lines go.',
  },
  children: [mark],
});

const link = statement('link', {
  doc: 'An arrow from a line of one card to another card: this call leads there. It leaves the card at the right edge of the line and enters the other card at its head.',
  examples: ['link submit 34 -> publish "outbox.publish(event)"'],
  arguments: [
    arg('from', ref('source'), 'The card the arrow starts in.'),
    arg(
      'fromLine',
      number({ min: 1 }),
      'The line the arrow starts at, in the numbers of the file; the card must show it.',
    ),
    arg('arrow', arrow({ '->': 'leads to' }), 'Always `->`.'),
    arg('to', ref('source'), 'The card the arrow points to.'),
    optionalArg('label', text(), 'What happens on the way, such as the call, written beside the arrow.'),
  ],
});

const statements = [source, link] as const;

/** The statement tables of code diagrams. */
export const codeSpec = kind('code', {
  doc: 'A code diagram: excerpts of real source files as highlighted cards, one below the other, with marked lines, numbered notes below each card and arrows from a call to what it calls. The files are read when the picture is built, so a renamed method fails the build instead of leaving a stale picture. Java, Kotlin, SQL, YAML, JSON and XML are highlighted.',
  header: {
    subtitle: attr(text(), 'Second line below the title.'),
    locale: localeAttribute,
  },
  statements,
});

/** Typed value of a top-level statement, derived from the tables (ADR 0004). */
export type CodeStatement = Infer<(typeof statements)[number]>;
