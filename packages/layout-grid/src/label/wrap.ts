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
