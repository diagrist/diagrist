import type { Grammar, GrammarStatement } from '@diagrist/lang';
import { isReference } from 'diagrist/tables';

/** A statement described in full, with the blocks it may stand in. */
export interface PlacedStatement {
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
export function placedStatements(grammar: Grammar): PlacedStatement[] {
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

/** Where a statement may stand, in words: `top level`, `top level and in blocks`, or `inside `alt``. */
export function whereOf(placed: PlacedStatement): string {
  if (placed.topLevel) return placed.parents.length > 0 ? 'top level and inside blocks' : 'top level';
  return `inside ${placed.parents.map((p) => `\`${p}\``).join(', ')}`;
}
