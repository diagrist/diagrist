/** Splits a text into two lines at ` · `, else at `, `, else at the last space before the middle. */
export function wrapTwo(text: string): [string] | [string, string] {
  const separator = text.indexOf(' · ');
  if (separator > 0) return [text.slice(0, separator), text.slice(separator + 3)];
  const comma = text.indexOf(', ');
  if (comma > 0) return [text.slice(0, comma + 1), text.slice(comma + 2)];
  const mid = Math.floor(text.length / 2);
  const before = text.lastIndexOf(' ', mid);
  const after = text.indexOf(' ', mid);
  const cut = before > 0 ? before : after;
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

/**
 * Splits a text into as few lines no wider than `max` as `measure` measures them as words allow, and of those the
 * narrowest, so the lines come out alike. A text with parts joined by ` · ` breaks between its parts first, dropping
 * the dot, and a part wider than `max` between its words; a single word wider than `max` stands on a line of its own.
 */
export function wrapWithin(text: string, max: number, measure: (s: string) => number): string[] {
  const parts = text.split(' · ');
  if (parts.length > 1)
    return greedy(
      parts.map((word, i) => ({ sep: i === 0 ? '' : ' · ', word })),
      max,
      measure,
    ).flatMap((line) => (measure(line) <= max ? [line] : wrapWithin(line, max, measure)));
  const all = text.split(' ');
  const words = all.map((word) => ({ sep: ' ', word }));
  const lines = greedy(words, max, measure);
  const runs = all.flatMap((_, a) => all.slice(a).map((__, k) => measure(all.slice(a, a + k + 1).join(' '))));
  const narrowest = runs
    .filter((w) => w <= max)
    .sort((a, b) => a - b)
    .find((w) => greedy(words, w, measure).length <= lines.length);
  return narrowest === undefined ? lines : greedy(words, narrowest, measure);
}
