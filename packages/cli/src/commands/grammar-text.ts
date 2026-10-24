import type { Grammar, GrammarField, GrammarLine, GrammarReference, GrammarStatement } from '@diagrist/lang';

const INDENT = '  ';

/**
 * A grammar for people: one block per statement with its signature, doc, fields and examples, children
 * indented below their parent. `--json` gives the same grammar as data.
 */
export function grammarText(grammar: Grammar): string {
  const header: GrammarLine = {
    doc: `Every ${grammar.kind} diagram starts with this line.`,
    examples: [`diagram ${grammar.kind} "Title"`],
    arguments: [],
    clauses: [],
    attributes: grammar.header,
    flags: [],
  };
  return [
    `${grammar.kind}: ${grammar.doc}`,
    ...lineText(`diagram ${grammar.kind} "Title"`, header, 0),
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

function isReference(child: GrammarStatement | GrammarReference): child is GrammarReference {
  return 'ref' in child;
}

function lineText(head: string, line: GrammarLine, depth: number): string[] {
  const pad = INDENT.repeat(depth);
  const signature = [
    head,
    ...line.arguments.map((a) => (a.optional ? `[${a.name}]` : `<${a.name}>`)),
    ...line.clauses.map((c) => `[${c.name} <${c.type}>]`),
    ...line.attributes.map((a) => `[${a.name}=<${a.type}>]`),
    ...line.flags.map((f) => `[${f.name}]`),
  ].join(' ');
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
