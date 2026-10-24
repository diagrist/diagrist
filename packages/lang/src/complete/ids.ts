import type { KindSpec, StatementSpec } from '../grammar/spec.js';
import type { Statement } from '../tree.js';
import { type CompletionItem, type IdsOf, matchArguments } from './line.js';

interface Declared {
  readonly id: string;
  readonly keyword: string;
  readonly line: number;
}

/**
 * The ids the statements of a document declare, by arguments and attributes whose value is `id()`, found through
 * the same tables `readKind` uses. Statements the tables do not know are skipped with everything below them.
 */
export function declaredIds(kind: KindSpec, statements: readonly Statement[]): IdsOf {
  const declared: Declared[] = [];
  const visit = (level: readonly Statement[], specs: readonly StatementSpec[]): void => {
    for (const statement of level) {
      const spec = specs.find((candidate) => candidate.keyword === statement.keyword);
      if (spec === undefined) continue;
      const declare = (id: string): void => {
        declared.push({ id, keyword: spec.keyword, line: statement.line });
      };
      for (const [argument, token] of matchArguments(spec, statement.arguments).filled) {
        if (argument.value.declaresId === true) declare(token.value);
      }
      for (const attribute of statement.attributes) {
        if (spec.attributes[attribute.key]?.value.declaresId === true) declare(attribute.value);
      }
      visit(statement.children, spec.children);
    }
  };
  visit(statements, kind.statements);
  return (keywords) =>
    declared
      .filter((d) => keywords.includes(d.keyword))
      .map(
        (d): CompletionItem => ({ label: d.id, kind: 'id', doc: `Declared by \`${d.keyword}\` in line ${d.line}.` }),
      );
}
