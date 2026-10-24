/**
 * How every `.dgr` file is written, whatever its kind: the handwritten part of the language overview and the skill.
 * It states what the scanner and the tree do; what a kind allows is generated from its tables.
 */
export const LANGUAGE_BASICS: readonly string[] = [
  'A `.dgr` file holds one diagram. Its first line names the kind and the title, `diagram sequence "Checkout"`, followed by the attributes of the header. Every other line is a statement: a keyword, then its arguments in the order the table gives, then flags, clauses and `key=value` attributes in any order.',
  'Texts stand in double quotes and may contain `\\"`. Ids are single words of letters, digits, `_` and `-` that start with a letter; a statement declares an id, and other statements refer to it by that word. An attribute value is a single word or a text in quotes, as in `stereotype="web app"`.',
  'Indentation nests: a line belongs to the nearest line above it with less indent, so the statements of a block such as a fragment are indented below it. `dgr fmt` writes two spaces per level and keeps at most one blank line. `#` starts a comment that runs to the end of the line.',
];
