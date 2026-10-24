/**
 * What XML 1.0 cannot hold, not even as a character reference: the C0 controls except tab, line feed and carriage
 * return, a surrogate without its partner, U+FFFE and U+FFFF. SVG is XML, so no picture can carry one.
 */
const NOT_XML = /(?![\t\n\r\x7F-\x9F])[\p{Cc}\p{Cs}￾￿]/u;

const EVERY_NOT_XML = new RegExp(NOT_XML.source, 'gu');

/** The first character of `text` that XML cannot hold, as `U+0001`, with its 0-based index; `undefined` if none. */
export function firstNotXml(text: string): { readonly index: number; readonly found: string } | undefined {
  const match = NOT_XML.exec(text);
  if (match === null) return undefined;
  const unit = match[0].charCodeAt(0).toString(16).toUpperCase().padStart(4, '0');
  return { index: match.index, found: `U+${unit}` };
}

/**
 * `text` with every character XML cannot hold replaced by U+FFFD, the replacement character. The scanner already
 * rejects them in a source (L005); writers of XML call this as well, for texts that reach them another way.
 */
export function xmlSafe(text: string): string {
  return text.replace(EVERY_NOT_XML, '�');
}
