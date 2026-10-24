import type { Kind } from '@diagrist/core';
import { type Attr, type KindSpec, read, readKind, type StatementSpec } from '@diagrist/lang';
import type { Catalog, Implements, SpecElement } from './catalog.js';

/** Where a mark sits or what an example uses: a statement, one of its parts, or one value of a part. */
interface Site {
  readonly keyword: string;
  readonly part?: string;
  readonly value?: string;
}

/**
 * What implements an element: a statement by its keyword, a part of it as written (`id=`, `~>`, `include`), or a
 * rule by its code.
 */
export interface Implementer {
  readonly keyword?: string;
  readonly written?: string;
  readonly rule?: string;
}

/** A mark found in the tables or the rules: the element, what implements it, and where, for matching examples. */
interface Claim {
  readonly element: SpecElement;
  readonly by: Implementer;
  readonly site?: Site;
}

/** One element of a catalog with everything that points at it; empty lists mean it is not covered. */
export interface Coverage {
  readonly element: SpecElement;
  readonly by: readonly Implementer[];
  readonly examples: readonly string[];
}

/** An example file of a kind: its name without extension and its source. */
export interface Example {
  readonly name: string;
  readonly source: string;
}

const marksOf = (part: object): Implements => part as Implements;

/** Claims of one part (argument, clause, attribute) of a statement, as a whole and per value. */
function partClaims(keyword: string, name: string, part: object, written: string): Claim[] {
  const { uml = [], umlValues = {} } = marksOf(part);
  return [
    ...uml.map((element) => ({ element, by: { keyword, written }, site: { keyword, part: name } })),
    ...Object.entries(umlValues).flatMap(([value, elements]) =>
      elements.map((element) => ({
        element,
        by: { keyword, written: written.endsWith('=') ? `${written}${value}` : value },
        site: { keyword, part: name, value },
      })),
    ),
  ];
}

function statementClaims(spec: StatementSpec): Claim[] {
  const { keyword } = spec;
  const { uml = [], umlFlags = {} } = marksOf(spec);
  const named = (record: Readonly<Record<string, Attr>>, written: (name: string) => string): Claim[] =>
    Object.entries(record).flatMap(([name, part]) => partClaims(keyword, name, part, written(name)));
  return [
    ...uml.map((element) => ({ element, by: { keyword }, site: { keyword } })),
    ...spec.arguments.flatMap((a) => partClaims(keyword, a.name, a, `<${a.name}>`)),
    ...named(spec.clauses, (name) => name),
    ...named(spec.attributes, (name) => `${name}=`),
    ...Object.entries(umlFlags).flatMap(([flag, elements]) =>
      elements.map((element) => ({
        element,
        by: { keyword, written: flag },
        site: { keyword, part: flag },
      })),
    ),
  ];
}

/** Every table of a kind once, in the order a walk from the top level meets them. */
function tablesOf(spec: KindSpec): StatementSpec[] {
  const seen = new Set<StatementSpec>();
  const visit = (s: StatementSpec): void => {
    if (seen.has(s)) return;
    seen.add(s);
    s.children.forEach(visit);
  };
  spec.statements.forEach(visit);
  return [...seen];
}

/** The claims of a kind: the marks on its tables, then those on its rules. */
export function claimsOf(kind: Kind): readonly Claim[] {
  const rules = kind.rules.flatMap((rule) =>
    (marksOf(rule).uml ?? []).map((element) => ({ element, by: { rule: rule.code } })),
  );
  return [...tablesOf(kind.spec).flatMap(statementClaims), ...rules];
}

/** What a statement read from an example uses, and the same for the statements indented below it. */
function sitesOf(statement: Readonly<Record<string, unknown>>, tables: readonly StatementSpec[]): Site[] {
  const keyword = String(statement.keyword);
  const spec = tables.find((s) => s.keyword === keyword);
  if (spec === undefined) return [];
  const valued = (part: string, value: unknown): Site =>
    typeof value === 'string' ? { keyword, part, value } : { keyword, part };
  const present = (record: unknown): Site[] =>
    Object.entries((record ?? {}) as Record<string, unknown>).flatMap(([part, value]) =>
      value === undefined || value === false ? [] : [valued(part, value)],
    );
  const children = (statement.children ?? []) as readonly Readonly<Record<string, unknown>>[];
  return [
    { keyword },
    ...spec.arguments.flatMap((a) => (statement[a.name] === undefined ? [] : [valued(a.name, statement[a.name])])),
    ...present(statement.clauses),
    ...present(statement.attributes),
    ...present(statement.flags),
    ...children.flatMap((child) => sitesOf(child, tables)),
  ];
}

/** Whether an example's site fulfils a claim; `gate.order` counts as the value `gate`. */
function fulfils(claim: Site, used: Site): boolean {
  if (claim.keyword !== used.keyword || (claim.part !== undefined && claim.part !== used.part)) return false;
  return claim.value === undefined || claim.value === used.value || claim.value === used.value?.split('.')[0];
}

/**
 * The coverage of a catalog by a kind (ADR 0017): per element the parts of the tables and the rules that implement
 * it, and the examples that use one of those parts. Nothing is declared covered; it follows from the marks.
 */
export function coverageOf(kind: Kind, catalog: Catalog, examples: readonly Example[]): Coverage[] {
  const claims = claimsOf(kind);
  const tables = tablesOf(kind.spec);
  const used = examples.map((example) => ({
    name: example.name,
    sites: readKind(kind.spec, read(example.source).document).statements.flatMap((s) =>
      sitesOf(s as Readonly<Record<string, unknown>>, tables),
    ),
  }));
  return Object.values(catalog).map((element) => {
    const own = claims.filter((claim) => claim.element === element);
    const sites = own.flatMap((claim) => (claim.site ? [claim.site] : []));
    return {
      element,
      by: own.map((claim) => claim.by),
      examples: used
        .filter((example) => sites.some((site) => example.sites.some((u) => fulfils(site, u))))
        .map((example) => example.name),
    };
  });
}
