import type { Grammar, GrammarField, GrammarLine, GrammarStatement } from '@diagrist/lang';
import { headerLine, isReference, signatureOf } from './signature.js';

const INDENT = '  ';

/**
 * A grammar for people: one block per statement with its signature, doc, fields and examples, children
 * indented below their parent. `--json` gives the same grammar as data.
 */
export function grammarText(grammar: Grammar): string {
  return [
    `${grammar.kind}: ${grammar.doc}`,
    ...lineText(`diagram ${grammar.kind} "Title"`, headerLine(grammar), 0),
    ...grammar.statements.flatMap((statement) => statementText(statement, 0)),
  ].join('\n');
}

/** A statement, its line form and its children; children described elsewhere are named in one line. */
function statementText(statement: GrammarStatement, depth: number): string[] {
  const described = statement.children.filter((child): child is GrammarStatement => !isReference(child));
  const elsewhere = statement.children.filter(isReference).map((child) => child.keyword);
  return [
    ...lineText(statement.keyword, statement, depth),
    ...(elsewhere.length > 0
      ? [`${INDENT.repeat(depth + 1)}also inside: ${elsewhere.join(', ')} (each described at its own entry)`]
      : []),
    ...(statement.lines ? lineText('(line without keyword)', statement.lines, depth + 1) : []),
    ...described.flatMap((child) => statementText(child, depth + 1)),
  ];
}

function lineText(head: string, line: GrammarLine, depth: number): string[] {
  const pad = INDENT.repeat(depth);
  const signature = signatureOf(head, line);
  const fields: [string, string][] = [
    ...line.arguments.map((a): [string, string] => [a.optional ? `[${a.name}]` : `<${a.name}>`, explain(a)]),
    ...line.clauses.map((c): [string, string] => [c.name, explain(c)]),
    ...line.attributes.map((a): [string, string] => [`${a.name}=`, explain(a)]),
    ...line.flags.map((f): [string, string] => [f.name, f.doc]),
  ];
  const width = Math.max(0, ...fields.map(([label]) => label.length));
  return [
    '',
    `${pad}${signature}`,
    `${pad}${INDENT}${line.doc}`,
    ...fields.map(([label, doc]) => `${pad}${INDENT}${label.padEnd(width)}  ${doc}`),
    ...line.examples.map((example) => `${pad}${INDENT}example: ${example}`),
  ];
}

function explain(field: GrammarField): string {
  return `${field.doc} Expected: ${field.expected}.`;
}
