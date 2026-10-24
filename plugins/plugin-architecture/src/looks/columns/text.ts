import { type Font, textWidth } from '@diagrist/core';

/** A line of text the sheet of `look=columns` sets, with its paint role and the font role it was measured with. */
export interface SheetText {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly role: string;
  readonly font: string;
}

/** Words of `text` in lines no wider than `width`; a word wider than that stands alone. */
export function wrap(text: string, width: number, font: Font): string[] {
  const lines: string[] = [];
  for (const word of text.split(' ')) {
    const last = lines.at(-1);
    if (last !== undefined && textWidth(`${last} ${word}`, font) <= width) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

/** `text`, shortened with an ellipsis until it is no wider than `width`. */
export function fit(text: string, width: number, font: Font): string {
  if (textWidth(text, font) <= width) return text;
  const chars = [...text];
  while (chars.length > 1 && textWidth(`${chars.join('').trimEnd()}…`, font) > width) chars.pop();
  return `${chars.join('').trimEnd()}…`;
}
