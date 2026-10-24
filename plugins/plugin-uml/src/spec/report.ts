import type { Kind } from '@diagrist/core';
import type { Catalog } from './catalog.js';
import { type Coverage, coverageOf, type Example, type Implementer } from './coverage.js';

/** A kind with the catalog of its chapter and its example files, as the report shows them. */
export interface CoveredKind {
  readonly kind: Kind;
  readonly chapter: string;
  readonly catalog: Catalog;
  readonly examples: readonly Example[];
}

const INTRO = [
  '<!-- Generated from the catalogs in src/spec and the marks on the tables and rules by `pnpm docs:generate`. Do not edit. -->',
  '',
  '# UML 2.5.1 coverage',
  '',
  'This report shows which elements of UML 2.5.1 the kinds of `plugin-uml` implement. Each kind has a catalog in `src/spec`: the elements a diagram of that kind can show, each with the section of the specification that defines it and a short title in our own words. The catalog quotes no text of the specification.',
  '',
  'Nobody declares an element covered. A statement, an argument, a value such as an arrow, a flag or a rule says which elements it implements, with `implementing` in the tables and rules (ADR 0017), and this report is derived from those marks. The same marks add a sentence like `UML 2.5.1: 17.4.3.1 Lost message.` to the docs of the tables, so the grammar, the language spec and the agent skill name the elements too. An element nothing points at is not covered. The examples column lists the files under `examples/` that use a part implementing the element.',
  '',
];

const escaped = (cell: string): string => cell.replace(/\|/g, '\\|');
const row = (cells: readonly string[]): string => `| ${cells.map(escaped).join(' | ')} |`;
const code = (text: string): string => `\`${text}\``;

/**
 * What implements an element, in a few words: statements by keyword, parts grouped by how they are written
 * (`` `alt`, `opt` with `id=` ``), then rule codes. Every name appears once.
 */
function implementers(by: readonly Implementer[]): string {
  const once = (names: readonly string[]): string[] => [...new Set(names)];
  const statements = once(by.flatMap((b) => (b.keyword !== undefined && b.written === undefined ? [b.keyword] : [])));
  const parts = once(by.flatMap((b) => (b.written !== undefined ? [b.written] : []))).map((written) => {
    const keywords = once(by.filter((b) => b.written === written).flatMap((b) => (b.keyword ? [b.keyword] : [])));
    return `${keywords.map(code).join(', ')} with ${code(written)}`;
  });
  const rules = once(by.flatMap((b) => (b.rule ? [b.rule] : [])));
  return [...statements.map(code), ...parts, ...rules].join(', ');
}

/** `oauth-pkce` alone, or `oauth-pkce` and the number of the others. */
function examplesCell(names: readonly string[]): string {
  const [first, ...rest] = [...names].sort();
  if (first === undefined) return '';
  return rest.length === 0 ? `\`${first}\`` : `\`${first}\` and ${rest.length} more`;
}

function section(covered: CoveredKind): string[] {
  const rows: readonly Coverage[] = coverageOf(covered.kind, covered.catalog, covered.examples);
  const done = rows.filter((r) => r.by.length > 0).length;
  const share = Math.round((100 * done) / rows.length);
  return [
    `## \`${covered.kind.spec.name}\`: ${covered.chapter}`,
    '',
    `${done} of ${rows.length} elements are covered (${share} %).`,
    '',
    row(['Element', 'Section', 'Covered by', 'Examples']),
    '|---|---|---|---|',
    ...rows.map((r) =>
      row([
        r.element.title,
        r.element.section,
        r.by.length > 0 ? implementers(r.by) : 'not covered',
        examplesCell(r.examples),
      ]),
    ),
    '',
  ];
}

/** The coverage report in Markdown: an introduction, then per kind its share and the table of its catalog. */
export function coverageReport(kinds: readonly CoveredKind[]): string {
  return [...INTRO, ...kinds.flatMap(section)].join('\n');
}
