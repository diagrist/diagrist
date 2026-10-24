import type { Locale } from './messages.js';

/**
 * Items as an inline code list, `` `a`, `b` ``, the way every diagnostic lists what is allowed or declared.
 * Items already in backticks stay as they are; an empty list reads `none`.
 */
export function list(items: readonly string[]): string {
  return items.length > 0 ? items.map((item) => (item.startsWith('`') ? item : `\`${item}\``)).join(', ') : 'none';
}

/** The end of a sentence about a typo: `; did you mean `x`?` with a suggestion, a full stop without. */
export function didYouMean(suggestion: string | undefined, locale: Locale): string {
  if (!suggestion) return '.';
  return locale === 'de' ? `; gemeint ist wohl \`${suggestion}\`?` : `; did you mean \`${suggestion}\`?`;
}

/**
 * The indefinite article for a word as it is read aloud: `an` before a vowel sound (`an actor`, `an adr`, `an
 * update`), `a` before a consonant and before a `u` read as "you" (`a state`, `a usecase`, `a unit`).
 */
export function article(word: string): 'a' | 'an' {
  return /^(?:[aeio]|u(?![b-df-hj-np-tv-z][aeiou]))/i.test(word) ? 'an' : 'a';
}

/** Alternatives as English writes them: `` `a` ``, `` `a` or `b` ``, `` `a`, `b` or `c` ``. */
export function either(items: readonly string[]): string {
  return items.length > 1 ? `${items.slice(0, -1).join(', ')} or ${items.at(-1)}` : (items[0] ?? '');
}
