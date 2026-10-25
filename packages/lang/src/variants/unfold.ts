import { type Diagnostic, diagnostic } from '../diagnostic.js';
import type { Need } from '../grammar/files.js';
import { type KindReading, readKind } from '../grammar/read-kind.js';
import { type LineContext, readLine } from '../grammar/read-line.js';
import type { Infer, KindSpec, StatementSpec } from '../grammar/spec.js';
import { LANG_CODES } from '../messages.js';
import type { Span } from '../span.js';
import type { Document, Statement } from '../tree.js';
import { mergeVariant, type Slot } from './merge.js';
import { pictureOf } from './picture.js';
import { sharedStatements } from './tables.js';
import { gather } from './uses.js';

/** One picture a file draws: the base, or one of its own variants, read against the kind's tables. */
export interface Picture<S> {
  /** The id of the variant; absent for the base picture. */
  readonly variant?: string;
  /** Where the variant asks for a diff picture with `diff`; absent when it does not. */
  readonly diff?: Span;
  readonly reading: KindReading<S>;
}

/** What `unfold` makes of a file: its pictures, the files it needs, and the findings about `use` and variants. */
export interface Unfolding<S> {
  readonly pictures: readonly Picture<S>[];
  /**
   * Every file the diagram reads, also those `files` already had, so a host knows what to hand over: the used files,
   * then the files of `file()` values (ADR 0025).
   */
  readonly needs: readonly Need[];
  readonly diagnostics: readonly Diagnostic[];
}

/** Where the file is and the texts of the files it needs, by the paths of `Unfolding.needs`. */
export interface UnfoldOptions {
  /** Path of the file relative to the folder the host runs in; `use` and `file()` paths are resolved against it. */
  readonly path?: string;
  readonly files?: Readonly<Record<string, string>>;
}

/**
 * Turns a file into its pictures (ADR 0021): the lines of used files go before its own, the base is one picture, and
 * each of its variants is another, merged into the picture it builds on and read against the kind's tables. Pure:
 * used files come in `files`; one that is missing is reported and listed in `needs`.
 */
export function unfold<S extends readonly StatementSpec[]>(
  kind: KindSpec<S>,
  document: Document,
  options: UnfoldOptions = {},
): Unfolding<Infer<S[number]>> {
  const [header, ...body] = document.statements;
  const path = options.path ?? 'diagram.dgr';
  const files = options.files ?? {};
  const gathered = gather(kind, body, files, [path]);
  const diagnostics = [...gathered.diagnostics];
  const lines = header === undefined ? gathered.base : [header, ...gathered.base];
  const base: Slot[] = gathered.base.map((statement) => ({ statement, origin: 'base' }));
  const pictures: Picture<Infer<S[number]>>[] = [
    { reading: readKind(kind, { statements: lines, trailingComments: [] }, { path, files }) },
  ];
  const built = new Map<string, Slot[]>();
  const all = gathered.variants.map((v) => v.statement);
  for (const { statement, own } of gathered.variants) {
    const head = readHead(kind, statement, all, built, diagnostics);
    if (head === undefined) continue;
    const parent = head.from === undefined ? base : built.get(head.from);
    if (parent === undefined) continue;
    const merged = mergeVariant(kind, parent, statement, head.id);
    diagnostics.push(...merged.diagnostics);
    built.set(
      head.id,
      merged.slots.filter((s) => s.dropped === undefined),
    );
    if (own && header !== undefined)
      pictures.push(pictureOf(kind, header, statement, head.id, merged.slots, { path, files }));
  }
  return { pictures, needs: needsOf(gathered.needs, pictures), diagnostics };
}

/** The files `use` reads, then those `file()` values name in any picture, each path once. */
function needsOf(used: readonly Need[], pictures: readonly Picture<unknown>[]): Need[] {
  const needs = [...used];
  for (const need of pictures.flatMap((p) => p.reading.needs))
    if (!needs.some((n) => n.path === need.path)) needs.push(need);
  return needs;
}

/** The first line of a variant: its id, unique among variants (L108), and the variant it builds on (L107, L116). */
function readHead(
  kind: KindSpec,
  statement: Statement,
  all: readonly Statement[],
  built: ReadonlyMap<string, Slot[]>,
  diagnostics: Diagnostic[],
): { id: string; from?: string } | undefined {
  const [spec] = sharedStatements(kind).filter((s) => s.keyword === 'variant');
  if (spec === undefined) return undefined;
  const context: LineContext = { diagnostics: [], references: [], declarations: [] };
  const input = { label: 'variant', keyword: 'variant', start: statement.keywordSpan, line: statement.line };
  const values = readLine(spec, { ...input, tokens: statement.arguments, attributes: statement.attributes }, context);
  diagnostics.push(...context.diagnostics);
  if (values === undefined) return undefined;
  const id = values.id as string;
  const from = (values.clauses as { from?: string }).from;
  const at = (s: Statement) => s.arguments[0]?.value;
  const earlier = all.find((s) => s !== statement && at(s) === id && all.indexOf(s) < all.indexOf(statement));
  const report = (code: string, span: Span, v: Record<string, string>) =>
    diagnostics.push(diagnostic(code, 'error', span, v));
  if (earlier !== undefined) {
    report(LANG_CODES.duplicateId, statement.arguments[0]?.span ?? statement.keywordSpan, {
      found: id,
      first: String(earlier.line),
    });
    return undefined;
  }
  if (from === undefined || built.has(from)) return from === undefined ? { id } : { id, from };
  const span = context.references[0]?.span ?? statement.keywordSpan;
  const target = all.find((s) => at(s) === from);
  if (target !== undefined && all.indexOf(target) > all.indexOf(statement)) {
    report(LANG_CODES.laterBase, span, { found: id, from, line: String(target.line) });
  } else if (target === undefined) {
    const known = [...built.keys()].map((k) => `\`${k}\``).join(', ') || 'none';
    report(LANG_CODES.unknownReference, span, {
      name: 'from',
      found: from,
      expected: 'the id of a `variant` declared above',
      known,
    });
  }
  return undefined;
}
