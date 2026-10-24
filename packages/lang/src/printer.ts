import type { Comment } from './scanner.js';
import type { Span } from './span.js';
import type { Argument, Attribute, Document, Entry, Statement } from './tree.js';

const INDENT = '  ';
const BARE_VALUE = /^[^\s"#]+$/;

/**
 * Writes a statement tree back as source. It changes as little as possible: two spaces per level and at most
 * one blank line. Token order, the spaces between tokens (aligned columns) and comments stay as written.
 * Reading the result gives the same tree, and printing it again gives the same text.
 */
export function print(document: Document): string {
  const lines = document.statements.flatMap((statement, index) => printStatement(statement, 0, index === 0));
  if (document.trailingComments.length > 0 && lines.length > 0) lines.push('');
  lines.push(...printComments(document.trailingComments, 0));
  return lines.length > 0 ? `${lines.join('\n')}\n` : '';
}

function printStatement(statement: Statement, depth: number, isFirst: boolean): string[] {
  return [
    ...printLine(statement, statement.keyword, depth, isFirst),
    ...statement.entries.flatMap((entry, index) => printLine(entry, quote(entry.text), depth + 1, index === 0)),
    ...statement.children.flatMap((child, index) =>
      printStatement(child, depth + 1, index === 0 && statement.entries.length === 0),
    ),
  ];
}

function printLine(part: Statement | Entry, head: string, depth: number, isFirst: boolean): string[] {
  const headSpan = 'keyword' in part ? part.keywordSpan : part.textSpan;
  let previous: Span = headSpan;
  let text = head;
  for (const token of inSourceOrder(part)) {
    text += ' '.repeat(gap(previous, token.span)) + printToken(token);
    previous = token.span;
  }
  if (part.comments.inline)
    text += ' '.repeat(gap(previous, part.comments.inline.span)) + printComment(part.comments.inline);
  return [
    ...(part.blankLineBefore && !isFirst ? [''] : []),
    ...printComments(part.comments.above, depth),
    `${INDENT.repeat(depth)}${text}`,
  ];
}

/** Spaces between two tokens of one line as written, at least one. */
function gap(before: Span, after: Span): number {
  return Math.max(1, after.column - (before.column + before.length));
}

function printComments(comments: readonly Comment[], depth: number): string[] {
  return comments.map((comment) => `${INDENT.repeat(depth)}${printComment(comment)}`);
}

function printComment(comment: Comment): string {
  if (comment.text === '') return '#';
  return comment.text.startsWith(' ') ? `#${comment.text}` : `# ${comment.text}`;
}

/** Arguments and attributes come from one line, so their columns restore the order they were written in. */
function inSourceOrder(part: Statement | Entry): (Argument | Attribute)[] {
  return [...part.arguments, ...part.attributes].sort((a, b) => a.span.column - b.span.column);
}

function printToken(token: Argument | Attribute): string {
  if (token.kind === 'attribute') {
    const bare = !token.quoted && BARE_VALUE.test(token.value);
    return `${token.key}=${bare ? token.value : quote(token.value)}`;
  }
  return token.kind === 'text' ? quote(token.value) : token.value;
}

function quote(text: string): string {
  return `"${text.replace(/["\\]/g, '\\$&')}"`;
}
