import { type CodeLine, isComment } from './lines.js';

const START = /#region\s+([\p{L}\p{N}_.-]*[\p{L}\p{N}_.])/u;
const END = /#endregion\b/;

/** The name a line opens a region with, if it is a comment and nothing else. */
const regionOf = (line: CodeLine): string | undefined => (isComment(line) ? START.exec(line.text)?.[1] : undefined);

/** Whether a line is a region marker, opening or closing; a symbol leaves such a line out of its preamble. */
export const isMarker = (line: CodeLine): boolean =>
  regionOf(line) !== undefined || (isComment(line) && END.test(line.text));

/** The names of the regions a file marks, in file order. */
export function regionNames(file: readonly CodeLine[]): string[] {
  return [...new Set(file.map(regionOf).filter((name) => name !== undefined))];
}

/**
 * The lines of the first region of that name, up to the end marker that closes it: regions inside it count, so their
 * end does not end it early. Markers of nested regions are left out too. Without an end the region runs to the end of
 * the file.
 */
export function region(file: readonly CodeLine[], name: string): CodeLine[] | undefined {
  const start = file.findIndex((line) => regionOf(line) === name);
  if (start < 0) return undefined;
  let depth = 1;
  const inside: CodeLine[] = [];
  for (const line of file.slice(start + 1)) {
    if (regionOf(line) !== undefined) depth++;
    else if (isMarker(line)) depth--;
    if (depth === 0) break;
    if (!isMarker(line)) inside.push(line);
  }
  return inside;
}
