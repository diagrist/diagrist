import { type Diagnostic, diagnostic } from './diagnostic.js';
import { LANG_CODES } from './messages.js';
import { type Comment, type Line, scan, type Token } from './scanner.js';
import type { Span } from './span.js';

/** A positional token of a line: a word, a text or an operator. */
export type Argument = Exclude<Token, { kind: 'attribute' }>;
/** A `key=value` token of a line. */
export type Attribute = Extract<Token, { kind: 'attribute' }>;

/**
 * Where a line of a picture comes from, compared with the picture it builds on (ADR 0021): unchanged, added by the
 * variant, changed by `set` or by declaring it again, or dropped and kept only so a diff picture can show it.
 */
export type Origin = 'base' | 'added' | 'changed' | 'removed';

/** What every line in the tree has, statement or entry. */
interface Part {
  readonly arguments: readonly Argument[];
  readonly attributes: readonly Attribute[];
  /** Comment lines directly above, and the comment at the end of the line itself. */
  readonly comments: { readonly above: readonly Comment[]; readonly inline?: Comment };
  /** Whether at least one empty line separates this line from the one before. */
  readonly blankLineBefore: boolean;
  readonly line: number;
  readonly indent: number;
  /** Set by `unfold` on the lines of a diff picture (`variant ... diff`); any other line has none and is `base`. */
  readonly origin?: Origin;
}

/**
 * One line of the source as data: a keyword, its arguments and attributes, and the lines indented below it.
 * This is the public contract between the language and the plugins (ADR 0002); what a statement means is
 * decided by the plugin that owns its keyword.
 */
export interface Statement extends Part {
  readonly keyword: string;
  readonly keywordSpan: Span;
  /** Indented statements below this one. */
  readonly children: readonly Statement[];
  /** Indented lines below this one that start with a text instead of a keyword, such as UML members. */
  readonly entries: readonly Entry[];
}

/**
 * An indented line that starts with a text, e.g. `"+ total() : Money" abstract` under a class (ADR 0003).
 * Entries belong to the statement above them and have no children of their own.
 */
export interface Entry extends Part {
  readonly text: string;
  readonly textSpan: Span;
}

/** A whole file as a statement tree, with its comments, so `print` can write it back formatted. */
export interface Document {
  readonly statements: readonly Statement[];
  /** Comment lines after the last statement. */
  readonly trailingComments: readonly Comment[];
}

/** What `read` returns: a tree even when the file has errors, and the diagnostics that say where. */
export interface Reading {
  readonly document: Document;
  readonly diagnostics: readonly Diagnostic[];
}

interface Draft extends Omit<Statement, 'children' | 'entries'> {
  readonly children: Draft[];
  readonly entries: Entry[];
}

/**
 * How deep statements nest. Every pass over the tree, in the language and in the plugins, recurses into the
 * children, so a deeper tree could exhaust the stack; no diagram a person reads comes near it.
 */
const MAX_DEPTH = 64;

/**
 * Reads the source into a statement tree. A line belongs to the nearest open statement with a smaller
 * indent. The tree is always returned, also when the source has errors, so editors can work on it. A statement
 * deeper than `MAX_DEPTH` is reported (L006) and left out of the tree with all lines indented below it.
 */
export function read(source: string): Reading {
  const scanned = scan(source);
  const diagnostics: Diagnostic[] = [...scanned.diagnostics];
  const roots: Draft[] = [];
  const open: Draft[] = [];
  let pending: Comment[] = [];
  let previousLine = 0;
  let tooDeep: number | undefined;

  for (const line of scanned.lines) {
    if (tooDeep !== undefined && line.indent >= tooDeep) continue;
    tooDeep = undefined;
    const blankLineBefore = previousLine > 0 && line.number - previousLine > 1;
    previousLine = line.number;

    const [first] = line.tokens;
    if (first === undefined) {
      if (line.comment) pending.push(line.comment);
      continue;
    }
    while ((open.at(-1)?.indent ?? -1) >= line.indent) open.pop();
    const parent = open.at(-1);

    if (first.kind === 'word' && open.length >= MAX_DEPTH) {
      diagnostics.push(diagnostic(LANG_CODES.tooDeep, 'error', first.span, { limit: String(MAX_DEPTH) }));
      tooDeep = line.indent;
    } else if (first.kind === 'word') {
      const statement: Draft = {
        ...toPart(line, pending, blankLineBefore, diagnostics),
        keyword: first.value,
        keywordSpan: first.span,
        children: [],
        entries: [],
      };
      (parent?.children ?? roots).push(statement);
      open.push(statement);
    } else if (first.kind === 'text' && parent) {
      parent.entries.push({
        ...toPart(line, pending, blankLineBefore, diagnostics),
        text: first.value,
        textSpan: first.span,
      });
    } else {
      diagnostics.push(diagnostic(LANG_CODES.missingKeyword, 'error', first.span, { found: describe(first) }));
    }
    pending = [];
  }

  return { document: { statements: roots, trailingComments: pending }, diagnostics };
}

/** Everything after the first token: arguments and attributes, plus comments and position. */
function toPart(line: Line, above: Comment[], blankLineBefore: boolean, diagnostics: Diagnostic[]): Part {
  const args: Argument[] = [];
  const attributes: Attribute[] = [];
  for (const token of line.tokens.slice(1)) {
    if (token.kind !== 'attribute') {
      args.push(token);
      continue;
    }
    if (attributes.some((a) => a.key === token.key)) {
      diagnostics.push(diagnostic(LANG_CODES.duplicateAttribute, 'warning', token.span, { key: token.key }));
    }
    attributes.push(token);
  }
  return {
    arguments: args,
    attributes,
    comments: line.comment ? { above, inline: line.comment } : { above },
    blankLineBefore,
    line: line.number,
    indent: line.indent,
  };
}

function describe(token: Token): string {
  if (token.kind === 'text') return `text "${token.value}"`;
  if (token.kind === 'attribute') return `attribute ${token.key}=`;
  return `${token.kind} ${token.value}`;
}
