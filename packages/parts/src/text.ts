import { type Font, textWidth } from '@diagrist/core';

/**
 * Words of `text` in lines no wider than `width`, measured in `font` and filled greedily from the left; a word wider
 * than `width` stands alone on its line rather than being cut.
 */
export function wrap(text: string, width: number, font: Font): string[] {
  const lines: string[] = [];
  for (const word of text.split(' ')) {
    const last = lines.at(-1);
    if (last !== undefined && textWidth(`${last} ${word}`, font) <= width) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

/**
 * `text` as it is when it fits into `width` in `font`, else cut character by character and ended with an ellipsis
 * until it fits. One character and the ellipsis are always left, however narrow `width` is.
 */
export function fit(text: string, width: number, font: Font): string {
  if (textWidth(text, font) <= width) return text;
  const chars = [...text];
  while (chars.length > 1 && textWidth(`${chars.join('').trimEnd()}…`, font) > width) chars.pop();
  return `${chars.join('').trimEnd()}…`;
}
