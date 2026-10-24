import type { Grammar, GrammarField, GrammarLine, GrammarReference, GrammarStatement } from '@diagrist/lang';

/** A statement described in full, with the blocks it may stand in. */
export interface Placed {
  readonly statement: GrammarStatement;
  /** Whether it may stand at the top level of a diagram. */
  readonly topLevel: boolean;
  /** Keywords of the statements it may be indented below, in the order they are described. */
  readonly parents: readonly string[];
}

/**
 * Every statement of a grammar that is described in full, depth first in the order of the tables, so a block's own
 * children such as `else` follow it. Each table appears once, however often other blocks reuse it.
 */
export function placedStatements(grammar: Grammar): Placed[] {
  const found: { statement: GrammarStatement; at: string }[] = [];
  const parents = new Map<string, string[]>();
  const visit = (statement: GrammarStatement, at: string): void => {
    found.push({ statement, at });
    statement.children.forEach((child, j) => {
      const full = isReference(child) ? child.ref : `${at}/children/${j}`;
      parents.set(full, [...(parents.get(full) ?? []), statement.keyword]);
      if (!isReference(child)) visit(child, full);
    });
  };
  grammar.statements.forEach((statement, i) => {
    visit(statement, `/statements/${i}`);
  });
  return found.map(({ statement, at }) => ({
    statement,
    topLevel: /^\/statements\/\d+$/.test(at),
    parents: [...new Set(parents.get(at) ?? [])],
  }));
}

export function isReference(child: GrammarStatement | GrammarReference): child is GrammarReference {
  return 'ref' in child;
}

/**
 * A line as written: the head, then `<argument>` or `[optional]`, then clauses, attributes and flags in brackets.
 * Values with a short list of choices show them, `[look=<plain|cards>]`.
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
  return field.choices && field.choices.length <= SHOWN_CHOICES ? field.choices.join('|') : field.type;
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

/** Where a statement may stand, in words: `top level`, `top level and in blocks`, or `inside `alt``. */
export function whereOf(placed: Placed): string {
  if (placed.topLevel) return placed.parents.length > 0 ? 'top level and inside blocks' : 'top level';
  return `inside ${placed.parents.map((p) => `\`${p}\``).join(', ')}`;
}
