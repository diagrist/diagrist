import type { Diagnostic } from '@diagrist/lang';

const keyOf = (d: Diagnostic): string => JSON.stringify([d.code, d.severity, d.span, d.values]);

/**
 * The findings of a file and of each of its pictures as one list (ADR 0021). A finding every picture has is listed
 * once, as one about the file; the others name the variant whose picture they are about in `picture`.
 */
export function mergeFindings(
  file: readonly Diagnostic[],
  pictures: readonly { readonly variant?: string; readonly diagnostics: readonly Diagnostic[] }[],
): Diagnostic[] {
  const [first, ...others] = pictures;
  if (first === undefined) return [...file];
  if (others.length === 0) return [...file, ...first.diagnostics];
  const everywhere = new Set(
    first.diagnostics.map(keyOf).filter((key) => others.every((p) => p.diagnostics.some((d) => keyOf(d) === key))),
  );
  const out = [...file];
  const listed = new Set<string>();
  for (const picture of pictures)
    for (const found of picture.diagnostics) {
      const key = keyOf(found);
      if (!everywhere.has(key))
        out.push(picture.variant === undefined ? found : { ...found, picture: picture.variant });
      else if (!listed.has(key)) {
        listed.add(key);
        out.push(found);
      }
    }
  return out;
}
