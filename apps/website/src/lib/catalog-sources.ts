/**
 * The small sources the catalog draws, one per tile. Each is built from a value of a table, so a value added to a
 * table gets its tile with the next build.
 */

/** One tile before it is drawn: what it shows, the line a file would write for it, and its whole source. */
export interface TileSource {
  readonly name: string;
  readonly line: string;
  readonly source: string;
}

/** The first line of a tile in the look of the page; the title stays empty, since the tile is cut to its content. */
export const headerOf = (kind: string, look: string, extra = ''): string =>
  `diagram ${kind} "" label="" look=${look}${extra}`;

/** A tile with one element: `keyword` of `kind` with the given attributes, labelled `label`. */
export function single(kind: string, look: string, keyword: string, label: string, attributes: string): TileSource {
  const line = `${keyword} a "${label}"${attributes}`;
  return {
    name: label,
    line,
    source: [headerOf(kind, look), 'grid cols c', 'grid rows r', `${line} at c/r`].join('\n'),
  };
}

/** A tile with two nodes on top of each other and an edge between them, as tones on edges need. */
export function toned(look: string, tone: string): TileSource {
  const line = `node a "${tone}" tone=${tone}`;
  return {
    name: tone,
    line: `${line} · edge a -> b tone=${tone}`,
    source: [
      headerOf('container', look),
      'grid cols c',
      'grid rows top,bottom',
      `${line} at c/top`,
      'node b "" at c/bottom',
      `edge a -> b "${tone}" tone=${tone}`,
    ].join('\n'),
  };
}

/**
 * A tile with an edge between two nodes side by side, labelled with the first word of what the arrow means: a label
 * of two words wraps in the narrow gap of some looks, and one word names the kind of edge well enough.
 */
export function arrowTile(look: string, arrow: string, meaning: string): TileSource {
  const label = meaning.split(' ')[0] ?? arrow;
  const line = `edge a ${arrow} b "${label}"`;
  return {
    name: arrow,
    line,
    source: [
      headerOf('container', look),
      'grid cols from,to',
      'grid rows r',
      'node a "A" at from/r',
      'node b "B" at to/r',
      line,
    ].join('\n'),
  };
}

/** A tile with a numbered flow of two steps over three elements, drawn with one flag of `flow`. */
export function flowTile(look: string, flag: string): TileSource {
  return {
    name: flag,
    line: `flow f ${flag}`,
    source: [
      headerOf('container', look),
      'grid cols user,app,data',
      'grid rows r',
      'person u "User" at user/r',
      'container a "App" at app/r',
      'container d "Data" shape=db at data/r',
      `flow f ${flag}`,
      '  u -> a "uses"',
      '  a => d "stores"',
    ].join('\n'),
  };
}

/** A tile with one frame of the given role around one node. */
export function frameTile(look: string, role: string): TileSource {
  const line = `group g "${role}" ${role}`;
  return {
    name: role,
    line,
    source: [
      headerOf('container', look, ' layout=adaptive'),
      'grid cols c',
      'grid rows r',
      line,
      'node a "Element" at c/r in g',
    ].join('\n'),
  };
}
