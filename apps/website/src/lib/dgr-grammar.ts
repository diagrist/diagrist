/**
 * A TextMate grammar for `.dgr` in the code blocks of the site, read the way the editor highlights: a comment, the
 * keyword that starts a line, the kind after `diagram`, texts, `name=` attributes, arrows and numbers.
 */
export const dgrGrammar: { name: string; scopeName: string; patterns: Rule[] } = {
  name: 'dgr',
  scopeName: 'source.dgr',
  patterns: [
    { match: '^\\s*#.*$', name: 'comment.line.number-sign.dgr' },
    {
      match: '^\\s*(diagram)\\s+([\\w-]+)',
      captures: { 1: { name: 'keyword.control.dgr' }, 2: { name: 'entity.name.type.dgr' } },
    },
    { match: '^\\s*([a-z][\\w-]*)', captures: { 1: { name: 'keyword.other.dgr' } } },
    {
      begin: '"',
      end: '"',
      name: 'string.quoted.double.dgr',
      patterns: [{ match: '\\\\.', name: 'constant.character.escape.dgr' }],
    },
    {
      match: '\\b([a-z][\\w-]*)(=)',
      captures: { 1: { name: 'entity.other.attribute-name.dgr' }, 2: { name: 'punctuation.separator.dgr' } },
    },
    { match: '[-.~=<>|*+]{2,}', name: 'keyword.operator.dgr' },
    { match: '\\b\\d+(\\.\\d+)?\\b', name: 'constant.numeric.dgr' },
  ],
};

/** A rule of a TextMate grammar, as far as this one uses it. */
interface Rule {
  readonly match?: string;
  readonly begin?: string;
  readonly end?: string;
  readonly name?: string;
  readonly captures?: Readonly<Record<string, { readonly name: string }>>;
  readonly patterns?: Rule[];
}
