import type { Grammar, GrammarField, GrammarLine, GrammarReference, GrammarStatement } from '@diagrist/lang';

/** Whether a child is described elsewhere in the grammar, `{ keyword, ref }`, rather than in full. */
export function isReference(child: GrammarStatement | GrammarReference): child is GrammarReference {
  return 'ref' in child;
}

/**
 * A line as written: the head, then `<argument>` or `[optional]`, then clauses, attributes and flags in brackets.
 * Values with a short list of choices show them, `[look=<plain|cards>]`, a longer list shows `<choice>`.
 */
export function signatureOf(head: string, line: GrammarLine): string {
  return [
    head,
    ...line.arguments.map((a) => (a.optional ? `[${a.name}]` : `<${a.name}>`)),
    ...line.clauses.map((c) => `[${c.name} <${shownValue(c)}>]`),
    ...line.attributes.map((a) => `[${a.name}=<${shownValue(a)}>]`),
    ...line.flags.map((f) => `[${f.name}]`),
  ]
    .filter((part) => part !== '')
    .join(' ');
}

const SHOWN_CHOICES = 6;

function shownValue(field: GrammarField): string {
  if (!field.choices) return field.type;
  return field.choices.length <= SHOWN_CHOICES ? field.choices.join('|') : 'choice';
}

/** The header of a kind as a line, so it is shown like a statement: `diagram <kind> "Title"` and its attributes. */
export function headerLine(grammar: Grammar): GrammarLine {
  return {
    doc: `Every ${grammar.kind} diagram starts with this line.`,
    examples: [`diagram ${grammar.kind} "Title"`],
    arguments: [],
    clauses: [],
    attributes: grammar.header,
    flags: [],
  };
}
