import type { Font } from '@diagrist/core';
import { MARGIN } from '../sheet/header.js';
import type { Hairline, SheetText } from '../sheet/texts.js';
import { wrap } from '../text.js';

/**
 * Pairs of what is seen and what it means as sentences `sight: meaning`, in the order the sights first appear;
 * meanings of the same sight join with ` / ` in their order, and a meaning said twice is said once.
 */
export function joinedSights(pairs: readonly (readonly [string, string])[]): string[] {
  const bySight = new Map<string, string[]>();
  for (const [sight, meaning] of pairs) {
    const meanings = bySight.get(sight) ?? [];
    if (!meanings.includes(meaning)) meanings.push(meaning);
    bySight.set(sight, meanings);
  }
  return [...bySight].map(([sight, meanings]) => `${sight}: ${meanings.join(' / ')}`);
}

/** Steps of the legend as sentences: from the hairline to the first baseline, and between baselines. */
const SENTENCES = { first: 20, line: 16 } as const;

/**
 * The legend as sentences: a hairline at `top` over the width of a sheet `width` wide inside its margins, and the
 * sentences run together and wrapped to that width in `font`. Without sentences nothing is drawn.
 */
export function sentenceLegend(
  sentences: readonly string[],
  top: number,
  width: number,
  font: Font,
): { readonly rules: readonly Hairline[]; readonly texts: readonly SheetText[] } {
  if (sentences.length === 0) return { rules: [], texts: [] };
  const lines = wrap(sentences.join(' '), width - 2 * MARGIN, font);
  return {
    rules: [{ x1: MARGIN, y1: top, x2: width - MARGIN, y2: top }],
    texts: lines.map(
      (text, i): SheetText => ({ x: MARGIN, y: top + SENTENCES.first + i * SENTENCES.line, text, role: 'legendText' }),
    ),
  };
}
