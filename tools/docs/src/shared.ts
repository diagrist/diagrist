import type { Plugin } from '@diagrist/core';
import { type Grammar, grammarOf, SHARED_KEYWORDS } from '@diagrist/lang';
import { type PlacedStatement, placedStatements } from './statements.js';

/** The anchor of the overview's section on the statements every kind has, for links from the kind pages. */
export const SHARED_ANCHOR = 'statements-of-every-kind';

/**
 * How variants and `use` work, the handwritten part of that section (ADR 0021). It states what `unfold` does; the
 * statements themselves are generated from their tables.
 */
export const SHARED_BASICS: readonly string[] = [
  'Every kind also has `use`, `variant`, `set` and `drop`. A file holds one base picture and any number of variants: a `variant` block repeats only the lines that differ, so as-is and to-be, phases or option A and B stay one source. A statement of the kind inside a variant adds a line, `set` changes the clauses, attributes and flags of a declared line, `drop` removes one. `from` builds a variant on one declared above it, and `diff` draws it as a comparison with what it builds on, if the kind can (C4 can).',
  'Where a line goes: `set` keeps the line in its place, and a line declared again after its `drop` takes the dropped line’s place. A new line goes before the next line of its keyword that the variant declares again, otherwise after the last line of its keyword, so lines keep the order they are written in. The grid and `at` are inherited, so an element keeps its cell in every picture.',
  '`use "file.dgr"` puts the lines and variants of another file of the same kind before the file’s own, so a decision paper can build on a shared base. Paths are relative to the file, stay inside the folder `dgr` runs in and name no hidden file. `dgr build` writes the base as `<file>.svg` and each variant as `<file>.<variant>.svg`; `--variant` builds one.',
];

/** A grammar without the statements every kind has, as the page of a kind lists its own. */
export function ownStatements(grammar: Grammar): Grammar {
  return { ...grammar, statements: grammar.statements.filter((s) => !SHARED_KEYWORDS.includes(s.keyword)) };
}

/**
 * The statements every kind has, placed as in the grammar of the first kind: `use` and `variant`, `set` and `drop`.
 * The kind's own statements, which a variant also takes, are left out, since they differ by kind.
 */
export function sharedStatements(plugins: readonly Plugin[]): PlacedStatement[] {
  const [kind] = plugins.flatMap((plugin) => plugin.kinds);
  if (kind === undefined) return [];
  const placed = placedStatements(grammarOf(kind.spec));
  return placed
    .filter((p) => SHARED_KEYWORDS.includes(p.statement.keyword))
    .map((p) => ({
      statement: { ...p.statement, children: p.statement.children.filter((c) => SHARED_KEYWORDS.includes(c.keyword)) },
      topLevel: p.topLevel,
      parents: p.parents.filter((parent) => SHARED_KEYWORDS.includes(parent)),
    }));
}
