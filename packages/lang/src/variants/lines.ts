import { type LineContext, readLine } from '../grammar/read-line.js';
import type { KindSpec } from '../grammar/spec.js';
import type { Argument, Entry, Origin, Statement } from '../tree.js';

/** The id a top-level line declares, read with its table, or `undefined` when it declares none. */
export function declaredId(kind: KindSpec, statement: Statement): string | undefined {
  const spec = kind.statements.find((s) => s.keyword === statement.keyword);
  if (spec === undefined) return undefined;
  const context: LineContext = { diagnostics: [], references: [], declarations: [] };
  readLine(
    spec,
    {
      label: spec.keyword,
      keyword: spec.keyword,
      start: statement.keywordSpan,
      tokens: statement.arguments,
      attributes: statement.attributes,
      line: statement.line,
    },
    context,
  );
  return context.declarations[0]?.id;
}

/** Whether `statement` starts with `keyword` and then `args`, compared token by token from the left. */
export function startsWith(statement: Statement, keyword: string, args: readonly Argument[]): boolean {
  return (
    statement.keyword === keyword &&
    args.every((a, i) => statement.arguments[i]?.kind === a.kind && statement.arguments[i]?.value === a.value)
  );
}

/** A line as diagnostics name it: keyword and its first arguments up to the first text, `edge doc -> portal`. */
export function headOf(statement: Statement): string {
  return [statement.keyword, ...keyTokens(statement.arguments)].join(' ');
}

/** The tokens that say which line a line is: the first ones up to the first text, such as `doc -> portal`. */
function keyTokens(args: readonly Argument[]): string[] {
  const end = args.findIndex((a) => a.kind === 'text');
  return args.slice(0, end < 0 ? args.length : end).map((a) => a.value);
}

const keyOf = (part: Statement | Entry): string =>
  'keyword' in part ? headOf(part) : JSON.stringify([part.text, ...keyTokens(part.arguments)]);

/** Whether two lines say the same: keyword or text, arguments and attributes, without what is indented below. */
function sameLine(a: Statement | Entry, b: Statement | Entry): boolean {
  const head = (part: Statement | Entry) => ('keyword' in part ? part.keyword : `"${part.text}`);
  const tokens = (part: Statement | Entry) => [
    head(part),
    ...part.arguments.map((t) => `${t.kind}:${t.value}`),
    ...part.attributes.map((t) => `${t.key}=${t.value}`).sort(),
  ];
  return JSON.stringify(tokens(a)) === JSON.stringify(tokens(b));
}

/** Whether two lines and everything indented below them say the same. */
export function sameTree(a: Statement, b: Statement): boolean {
  const pairs = <T extends Statement | Entry>(x: readonly T[], y: readonly T[], same: (p: T, q: T) => boolean) =>
    x.length === y.length && x.every((p, i) => same(p, y[i] as T));
  return sameLine(a, b) && pairs(a.children, b.children, sameTree) && pairs(a.entries, b.entries, sameLine);
}

/** A line and everything below it with `origin` set, or with no origin for `base`. */
export function tagged<T extends Statement | Entry>(part: T, origin: Origin): T {
  const { origin: _old, ...rest } = part;
  const own = origin === 'base' ? rest : { ...rest, origin };
  if (!('keyword' in part)) return own as T;
  const statement = part as Statement;
  return {
    ...own,
    children: statement.children.map((c) => tagged(c, origin)),
    entries: statement.entries.map((e) => tagged(e, origin)),
  } as unknown as T;
}

/**
 * A block declared again, its indented lines compared one by one with the lines it had: unchanged ones stay `base`,
 * ones with the same start are `changed`, new ones `added`, and lines it no longer has follow as `removed`.
 */
export function changedBlock(before: Statement, after: Statement): Statement {
  const compare = <T extends Statement | Entry>(
    old: readonly T[],
    now: readonly T[],
    same: (a: T, b: T) => boolean,
  ) => {
    const marked = now.map((line) => {
      const match = old.find((o) => keyOf(o) === keyOf(line));
      return tagged(line, match === undefined ? 'added' : same(match, line) ? 'base' : 'changed');
    });
    const gone = old.filter((o) => !now.some((line) => keyOf(o) === keyOf(line)));
    return [...marked, ...gone.map((o) => tagged(o, 'removed'))];
  };
  return {
    ...after,
    origin: 'changed',
    children: compare(before.children, after.children, sameTree),
    entries: compare(before.entries, after.entries, sameLine),
  };
}
