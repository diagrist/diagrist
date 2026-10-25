import type { KindSpec, LineSpec, StatementSpec } from '../grammar/spec.js';
import { LANG_CODES } from '../messages.js';
import { scan, type Token } from '../scanner.js';
import { type Span, span } from '../span.js';
import { type Document, read } from '../tree.js';
import { sharedStatements } from '../variants/tables.js';
import { declaredIds } from './ids.js';
import { type CompletionItem, type IdsOf, lineItems } from './line.js';

/** A place in the source, 1-based like `Span`: the cursor stands before the character at `column`. */
export interface Position {
  readonly line: number;
  readonly column: number;
}

/** What `complete` proposes at a position, and which part of the line an accepted item replaces. */
export interface Completion {
  /** The word typed so far, which an item replaces; after `key=` only the part behind `=`. Empty at a space. */
  readonly span: Span;
  /** What the tables allow here and what starts with the typed word, in table order. */
  readonly items: readonly CompletionItem[];
}

/** The block a new line opens into: its allowed child statements, and its line form if it has one. */
interface Block {
  readonly statements: readonly StatementSpec[];
  readonly lines?: LineSpec;
}

/**
 * What may be written at a position of a diagram of `kind`, derived from its tables (ADR 0004): keywords allowed in
 * the enclosing block, the next arguments' allowed values, flags, clauses and attributes not used yet, and declared
 * ids where a value refers to them. Pure and synchronous, as the base of the language server and editors. Inside a
 * text or a comment it proposes nothing.
 */
export function complete(source: string, position: Position, kind: KindSpec): Completion {
  const lines = source.split(/\r\n?|\n/);
  const before = (lines[position.line - 1] ?? '').slice(0, Math.max(0, position.column - 1));
  const typed = /[^\s"]*$/.exec(before)?.[0] ?? '';
  const equals = typed.indexOf('=');
  const prefix = typed.slice(equals + 1);
  const at = span(position.line, position.column - prefix.length, prefix.length);
  const scanned = scan(before);
  const inText = scanned.diagnostics.some((d) => d.code === LANG_CODES.unterminatedString);
  if (inText || scanned.lines[0]?.comment !== undefined) return { span: at, items: [] };

  const tokens = scan(before.slice(0, before.length - typed.length)).lines[0]?.tokens ?? [];
  const above = read(lines.slice(0, position.line - 1).join('\n')).document;
  const idsOf = declaredIds(kind, read(source).document.statements);
  const withShared = { ...kind, statements: [...kind.statements, ...sharedStatements(kind)] };
  const items = itemsAt(withShared, above, before.length - before.trimStart().length, tokens, typed, idsOf);
  const seen = new Set<string>();
  const fitting = items.filter(
    (item) => item.label.startsWith(prefix) && !seen.has(item.label) && seen.add(item.label),
  );
  return { span: at, items: fitting };
}

function itemsAt(
  kind: KindSpec,
  above: Document,
  indent: number,
  tokens: readonly Token[],
  typed: string,
  idsOf: IdsOf,
): CompletionItem[] {
  const [first, ...rest] = above.statements;
  if (first?.keyword !== 'diagram') return headerItems(kind, tokens, typed);
  const block = blockAt(kind, rest, indent);
  if (block === undefined) return [];
  const [head, ...tail] = tokens;
  if (head === undefined) {
    const keywords = block.statements.map((s): CompletionItem => ({ label: s.keyword, kind: 'keyword', doc: s.doc }));
    return [...keywords, ...(block.lines && !typed.includes('=') ? lineItems(block.lines, [], typed, idsOf) : [])];
  }
  const spec = head.kind === 'word' ? block.statements.find((s) => s.keyword === head.value) : undefined;
  if (spec !== undefined) return lineItems(spec, tail, typed, idsOf);
  return block.lines ? lineItems(block.lines, tokens, typed, idsOf) : [];
}

/** The first line: `diagram`, then the kind's name, then the title, then the header attributes. */
function headerItems(kind: KindSpec, tokens: readonly Token[], typed: string): CompletionItem[] {
  const [head, name, title] = tokens;
  if (head === undefined) {
    return [{ label: 'diagram', kind: 'keyword', doc: `Starts the diagram: \`diagram ${kind.name} "Title"\`.` }];
  }
  if (head.kind !== 'word' || head.value !== 'diagram') return [];
  if (name === undefined) return [{ label: kind.name, kind: 'value', doc: kind.doc }];
  if (title === undefined) return [];
  const header: LineSpec = {
    doc: kind.doc,
    examples: [],
    arguments: [],
    clauses: {},
    attributes: kind.header,
    flags: {},
  };
  return lineItems(header, tokens.slice(3), typed, () => []);
}

/**
 * The block a line with this indent belongs to: the deepest open statement above it with a smaller indent, as
 * `read` nests lines. `undefined` when a statement on the way is not in the tables.
 */
function blockAt(kind: KindSpec, statements: Document['statements'], indent: number): Block | undefined {
  let block: Block = { statements: kind.statements };
  let level = statements;
  for (let last = level.at(-1); last !== undefined && last.indent < indent; last = level.at(-1)) {
    const keyword = last.keyword;
    const spec = block.statements.find((candidate) => candidate.keyword === keyword);
    if (spec === undefined) return undefined;
    block = spec.lines ? { statements: spec.children, lines: spec.lines } : { statements: spec.children };
    level = last.children;
  }
  return block;
}
