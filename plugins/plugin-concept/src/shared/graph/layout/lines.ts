import { LINES } from '../../declarations.js';
import type { Graph } from '../model.js';

/**
 * The picture with links that look different where only their line and head can tell them apart: in the legend of
 * a picture whose lines carry no words. A link whose line the author left open and whose line and head an earlier
 * link of the picture already shows takes the first of `solid`, `dashed` and `dotted` no other link shows with that
 * head; links with a line of their own keep it. `worded` says which links stand on their lines in words, which
 * tells them apart already.
 */
export function distinctLines(m: Graph, worded: (link: string) => boolean): Graph {
  const used = new Set(m.relations.map((r) => r.link));
  const shown = [...m.links.values()].filter((l) => used.has(l.id) && !worded(l.id));
  const key = (line: string, head: string) => `${line}|${head}`;
  const taken = new Set(shown.filter((l) => l.lined).map((l) => key(l.line, l.head)));
  const links = new Map(m.links);
  for (const link of shown) {
    if (link.lined) continue;
    const line = taken.has(key(link.line, link.head))
      ? (LINES.find((l) => !taken.has(key(l, link.head))) ?? link.line)
      : link.line;
    taken.add(key(line, link.head));
    if (line !== link.line) links.set(link.id, { ...link, line });
  }
  return { ...m, links };
}

/**
 * Whether the links of a picture in layers need their words on the lines: when two of them still show the same line
 * and head, so the legend cannot tell them apart. Links that are `bare` never take words.
 */
export function linesAlike(m: Graph): boolean {
  const used = new Set(m.relations.map((r) => r.link));
  const shown = [...m.links.values()].filter((l) => used.has(l.id) && !l.bare).map((l) => `${l.line}|${l.head}`);
  return new Set(shown).size < shown.length;
}
