/**
 * Splits a text into two lines at ` · `, else at `, `, else between the chunks of `chunksOf` at the last space before
 * the middle, so a number keeps its unit and no line starts with a closing token. A break outside brackets whose
 * lines both `fit` comes first, so a guard in brackets stays whole where it fits on a line of its own.
 */
export function wrapTwo(text: string, fit: (line: string) => boolean = () => true): [string] | [string, string] {
  const separator = text.indexOf(' · ');
  if (separator > 0) return [text.slice(0, separator), text.slice(separator + 3)];
  const comma = text.indexOf(', ');
  if (comma > 0) return [text.slice(0, comma + 1), text.slice(comma + 2)];
  const mid = Math.floor(text.length / 2);
  const chunks = chunksOf(text);
  const all: { at: number; outside: boolean }[] = [];
  let at = -1;
  for (const [i, c] of chunks.slice(0, -1).entries()) {
    at += 1 + c.text.length;
    all.push({ at, outside: (chunks[i + 1] as { cost: number }).cost === 0 });
  }
  const whole = all.filter((c) => c.outside && fit(text.slice(0, c.at)) && fit(text.slice(c.at + 1)));
  const cuts = (whole.length > 0 ? whole : all).map((c) => c.at);
  const before = cuts.filter((c) => c <= mid).at(-1);
  const cut = before ?? cuts.find((c) => c > mid) ?? -1;
  if (cut <= 0) return [text];
  return [text.slice(0, cut), text.slice(cut + 1)];
}

/** The widest a line of an edge's text runs before it wraps, in sizes of its font: two or three words. */
export const WRAP_EM = 16;

/** Lines of `words` filled greedily up to `max`, each with the separator before it, dropped where a line breaks. */
function greedy(
  words: readonly { sep: string; word: string }[],
  max: number,
  measure: (s: string) => number,
): string[] {
  const lines: string[] = [];
  let line = '';
  for (const { sep, word } of words) {
    const joined = line === '' ? word : `${line}${sep}${word}`;
    if (line === '' || measure(joined) <= max) line = joined;
    else {
      lines.push(line);
      line = word;
    }
  }
  return line === '' ? lines : [...lines, line];
}

/** Tokens that only close or punctuate, which never start a line: `%`, `)`, `]`, `,`, `:` and the like. */
const CLOSING = /^[%‰)\]}»,.:;!?]+$/u;

/** Tokens that only open, which never end a line. */
const OPENING = /^[([{«]+$/u;

/** Units, possibly closed by punctuation, which stay with the number before them. */
const UNIT = /^(?:%|‰|°C?|€|\$|ms|s|min|h|px|pt|em|[kMGT]?B|[kMG]?Hz|[kcm]?m|kg|g)[)\]}»,.:;!?]*$/u;

/** Operators of guards and conditions, which never end a line, so a text breaks before them. */
const OPERATORS = new Set([
  '<',
  '>',
  '<=',
  '>=',
  '≤',
  '≥',
  '=',
  '==',
  '!=',
  '≠',
  '+',
  '*',
  '/',
  '&&',
  '||',
  '→',
  '->',
  '=>',
]);

/** Words that join conditions, the operators a text breaks before most readily. */
const JOINS = new Set(['und', 'oder', 'and', 'or', 'nicht', 'not']);

/**
 * The words of a text joined into chunks no line breaks within: a closing token or a unit after a number stays with
 * the word before it, an opening token or an operator, and inside brackets a join such as `und`, with the word after
 * it. Each chunk carries the cost of a break before it: none outside brackets, else 2, plus 1 before a word that is
 * no operator and 0.5 before a comparison, so a guard breaks before `und` first, then before an operator.
 */
function chunksOf(text: string): { text: string; cost: number }[] {
  const chunks: { text: string; cost: number }[] = [];
  let depth = 0;
  let glue = false;
  for (const word of text.split(' ')) {
    const previous = chunks.at(-1);
    const sticks = CLOSING.test(word) || (UNIT.test(word) && /\d$/u.test(previous?.text ?? ''));
    if (previous !== undefined && (glue || sticks)) previous.text = `${previous.text} ${word}`;
    else {
      const join = JOINS.has(word);
      const inside = depth > 0 ? 2 + (join ? 0 : OPERATORS.has(word) ? 0.5 : 1) : 0;
      chunks.push({ text: word, cost: inside });
    }
    glue = OPENING.test(word) || OPERATORS.has(word) || (depth > 0 && JOINS.has(word));
    for (const c of word) depth = Math.max(0, depth + (c === '[' || c === '(' ? 1 : c === ']' || c === ')' ? -1 : 0));
  }
  return chunks;
}

/**
 * The fewest lines, then the cheapest breaks, that cut `chunks` into lines no wider than `w` by `width(a, b)`, the
 * width of chunks `a` to `b`, a chunk wider than `w` on a line of its own; with the starts of the lines.
 */
function breaksWithin(
  chunks: readonly { cost: number }[],
  w: number,
  width: (a: number, b: number) => number,
): { lines: number; cost: number; starts: number[] } {
  const n = chunks.length;
  const best: { lines: number; cost: number; starts: number[] }[] = [{ lines: 0, cost: 0, starts: [] }];
  for (let b = 1; b <= n; b++) {
    let pick = { lines: Number.POSITIVE_INFINITY, cost: 0, starts: [] as number[] };
    for (let a = b - 1; a >= 0; a--) {
      if (a < b - 1 && width(a, b - 1) > w) break;
      const before = best[a] as (typeof best)[number];
      const cost = before.cost + (a > 0 ? (chunks[a] as { cost: number }).cost : 0);
      if (before.lines + 1 < pick.lines || (before.lines + 1 === pick.lines && cost < pick.cost))
        pick = { lines: before.lines + 1, cost, starts: [...before.starts, a] };
    }
    best.push(pick);
  }
  return best[n] as (typeof best)[number];
}

/**
 * Splits a text into as few lines no wider than `max` as `measure` measures them as words allow, of those the one
 * whose breaks cost least, and of those the narrowest, so the lines come out alike. A text with parts joined by ` · `
 * breaks between its parts first, dropping the dot, and a part wider than `max` between its words. A line never
 * starts with a closing token such as `%` or `]` or ends with an opening one or an operator, a number keeps its
 * unit, and a text breaks inside brackets only where it must, before `und` or an operator first (`chunksOf`). A
 * single word wider than `max` stands on a line of its own.
 */
export function wrapWithin(text: string, max: number, measure: (s: string) => number): string[] {
  const parts = text.split(' · ');
  if (parts.length > 1)
    return greedy(
      parts.map((word, i) => ({ sep: i === 0 ? '' : ' · ', word })),
      max,
      measure,
    ).flatMap((line) => (measure(line) <= max ? [line] : wrapWithin(line, max, measure)));
  if (text === '') return [];
  const chunks = chunksOf(text);
  const runs = chunks.map((_, a) => chunks.map((__, b) => (b < a ? 0 : measure(textOf(chunks, a, b)))));
  const width = (a: number, b: number) => (runs[a] as number[])[b] as number;
  const target = breaksWithin(chunks, max, width);
  const narrowest = [...new Set(runs.flat().filter((w) => w > 0 && w <= max))]
    .sort((a, b) => a - b)
    .map((w) => breaksWithin(chunks, w, width))
    .find((b) => b.lines === target.lines && b.cost === target.cost);
  const { starts } = narrowest ?? target;
  return starts.map((a, i) => textOf(chunks, a, (starts[i + 1] ?? chunks.length) - 1));
}

/** The text of chunks `a` to `b`, joined by spaces. */
const textOf = (chunks: readonly { text: string }[], a: number, b: number): string =>
  chunks
    .slice(a, b + 1)
    .map((c) => c.text)
    .join(' ');
