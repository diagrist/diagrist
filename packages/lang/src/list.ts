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
