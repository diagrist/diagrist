import { type Diagnostic, diagnostic } from './diagnostic.js';
import { LANG_CODES } from './messages.js';
import { type Span, span } from './span.js';

/** Longest first, so `--|>` wins over `-->` and `--`. `o--` and `*--` are the diamond ends of UML. */
export const OPERATORS = ['<->', '--|>', '-->', '-|>', '->', 'o--', '*--', '--', '~>', '=>', '='] as const;

export type Operator = (typeof OPERATORS)[number];

export type Token =
  | { readonly kind: 'word'; readonly value: string; readonly span: Span }
  | { readonly kind: 'text'; readonly value: string; readonly span: Span }
  | { readonly kind: 'operator'; readonly value: Operator; readonly span: Span }
  | {
      readonly kind: 'attribute';
      readonly key: string;
      readonly value: string;
      readonly quoted: boolean;
      readonly span: Span;
    };

/** A comment as written after `#`, including its leading spaces, so aligned continuations survive printing. */
export interface Comment {
  readonly text: string;
  readonly span: Span;
}

/** One non-empty source line: its tokens and an optional comment after them. */
export interface Line {
  readonly number: number;
  readonly indent: number;
  readonly tokens: readonly Token[];
  readonly comment?: Comment;
}

export interface Scan {
  readonly lines: readonly Line[];
  readonly diagnostics: readonly Diagnostic[];
}

const ATTRIBUTE = /^([A-Za-z_][\w-]*)=(?:"((?:[^"\\]|\\.)*)"|([^\s"]+))/;
const WORD = /^[^\s"]+/;

const unescapeText = (raw: string): string => raw.replace(/\\(["\\])/g, '$1');

/**
 * Splits the source into lines of tokens. It never throws: an unterminated text still becomes a token,
 * reported as L001, so the rest of the file is read and the editor keeps working.
 */
export function scan(source: string): Scan {
  const lines: Line[] = [];
  const diagnostics: Diagnostic[] = [];
  source.split(/\r?\n/).forEach((text, index) => {
    const line = scanLine(text, index + 1, diagnostics);
    if (line) lines.push(line);
  });
  return { lines, diagnostics };
}

function scanLine(text: string, number: number, diagnostics: Diagnostic[]): Line | undefined {
  const indent = text.length - text.trimStart().length;
  if (text.slice(0, indent).includes('\t')) {
    diagnostics.push(diagnostic(LANG_CODES.tabIndent, 'warning', span(number, 1, indent)));
  }

  const tokens: Token[] = [];
  let at = indent;
  while (at < text.length) {
    const char = text[at];
    if (char === ' ' || char === '\t') {
      at++;
      continue;
    }
    if (char === '#') {
      const comment = { text: text.slice(at + 1).trimEnd(), span: span(number, at + 1, text.length - at) };
      return { number, indent, tokens, comment };
    }
    const token = readToken(text, at, number, diagnostics);
    tokens.push(token);
    at += token.span.length;
  }
  return tokens.length > 0 ? { number, indent, tokens } : undefined;
}

function readToken(text: string, start: number, number: number, diagnostics: Diagnostic[]): Token {
  const rest = text.slice(start);
  const at = (length: number): Span => span(number, start + 1, length);

  const attribute = ATTRIBUTE.exec(rest);
  if (attribute?.[1] !== undefined) {
    const quoted = attribute[2] !== undefined;
    const value = quoted ? unescapeText(attribute[2] ?? '') : (attribute[3] ?? '');
    return { kind: 'attribute', key: attribute[1], value, quoted, span: at(attribute[0].length) };
  }

  const operator = OPERATORS.find((o) => rest.startsWith(o) && !/[\w"]/.test(rest[o.length] ?? ' '));
  if (operator !== undefined) return { kind: 'operator', value: operator, span: at(operator.length) };

  if (rest.startsWith('"')) return readText(rest, at, diagnostics);
  return readWord(rest, at);
}

/** Whatever is not an attribute, operator or text. `rest` is never empty and starts with neither space nor quote. */
function readWord(rest: string, at: (length: number) => Span): Token {
  const word = WORD.exec(rest)?.[0] ?? rest.slice(0, 1);
  return { kind: 'word', value: word, span: at(word.length) };
}

function readText(rest: string, at: (length: number) => Span, diagnostics: Diagnostic[]): Token {
  for (let i = 1; i < rest.length; i++) {
    if (rest[i] === '\\') i++;
    else if (rest[i] === '"') return { kind: 'text', value: unescapeText(rest.slice(1, i)), span: at(i + 1) };
  }
  const where = at(rest.length);
  diagnostics.push(diagnostic(LANG_CODES.unterminatedString, 'error', where));
  return { kind: 'text', value: unescapeText(rest.slice(1)), span: where };
}
