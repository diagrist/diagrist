import { createHash } from 'node:crypto';
import { type Anchors, compile, formatMessage } from '@diagrist/core';
import { type Grammar, type GrammarField, type GrammarStatement, grammarOf } from '@diagrist/lang';
import { arrowTile, flowTile, frameTile, single, type TileSource, toned } from './catalog-sources.js';
import { editorLink, plugins, scoped } from './render.js';

/** A drawn tile: its source parts, the picture cut to its content, and the editor with its source. */
export interface Tile extends TileSource {
  readonly svg: string;
  readonly editor: string;
}

/** A section of the catalog: one table field, what the table says about it, and a tile per value. */
export interface Section {
  readonly id: string;
  readonly title: string;
  readonly doc: string;
  readonly wide: boolean;
  readonly tiles: readonly Tile[];
}

/** The C4 levels; the middle one holds what all three share, the other two add their own elements. */
const LEVELS = ['context', 'container', 'component'] as const;
const SHARED = 'container';

/** Room around the cut picture, for what sticks out of a box: icon circles, instance stacks, labels. */
const PAD = 28;

const grammarNamed = (name: string): Grammar => {
  const kind = plugins.flatMap((plugin) => plugin.kinds).find((k) => k.spec.name === name);
  if (kind === undefined) throw new Error(`Diagrist catalog: no kind \`${name}\``);
  return grammarOf(kind.spec);
};

const statementOf = (grammar: Grammar, keyword: string): GrammarStatement => {
  const statement = grammar.statements.find((s) => s.keyword === keyword);
  if (statement === undefined) throw new Error(`Diagrist catalog: \`${grammar.kind}\` has no \`${keyword}\``);
  return statement;
};

const fieldOf = (fields: readonly GrammarField[], name: string): GrammarField => {
  const field = fields.find((f) => f.name === name);
  if (field?.choices === undefined) throw new Error(`Diagrist catalog: no choices for \`${name}\``);
  return field;
};

/** The looks of the C4 kinds, in the order of their table; the first is the default. */
export const LOOKS: readonly string[] = fieldOf(grammarNamed(SHARED).header, 'look').choices ?? [];

/** The picture with its view box cut to the nodes, frames and edges it placed. */
function cut(svg: string, anchors: Anchors): string {
  const rects = [...anchors.nodes, ...anchors.groups].map((n) => n.rect);
  const points = anchors.edges.flatMap((e) => e.points);
  const xs = [...rects.flatMap((r) => [r.x, r.x + r.w]), ...points.map(([px]) => px)];
  const ys = [...rects.flatMap((r) => [r.y, r.y + r.h]), ...points.map(([, py]) => py)];
  const x = Math.min(...xs) - PAD;
  const y = Math.min(...ys) - PAD;
  const width = Math.max(...xs) + PAD - x;
  const height = Math.max(...ys) + PAD - y;
  return svg.replace(
    /<svg([^>]*?) viewBox="[^"]*" width="[^"]*" height="[^"]*"/,
    `<svg$1 viewBox="${x} ${y} ${width} ${height}" width="${width}" height="${height}"`,
  );
}

/** Draws a tile, or stops the build with its findings: the catalog shows nothing a file could not write cleanly. */
function draw(tile: TileSource): Tile {
  const result = compile(tile.source, { plugins });
  if (result.svg === undefined || result.anchors === undefined || result.diagnostics.length > 0) {
    const found = result.diagnostics.map((d) => `  ${d.code} ${formatMessage(d, plugins, 'en')}`).join('\n');
    throw new Error(`Diagrist catalog: the tile \`${tile.line}\` does not compile cleanly\n${tile.source}\n${found}`);
  }
  const name = `cat-${createHash('sha256').update(tile.source).digest('hex').slice(0, 8)}`;
  return { ...tile, svg: scoped(cut(result.svg, result.anchors), name), editor: editorLink(tile.source) };
}

/** Every section of the catalog in one look, each derived from the tables of the C4 kinds (ADR 0004). */
export function catalog(look: string): Section[] {
  const grammar = grammarNamed(SHARED);
  const node = statementOf(grammar, 'node');
  const edge = statementOf(grammar, 'edge');
  const flow = statementOf(grammar, 'flow');
  const group = statementOf(grammar, 'group');
  const values = (name: string) => fieldOf(node.attributes, name).choices ?? [];
  const docOf = (name: string) => fieldOf(node.attributes, name).doc;
  const elements = LEVELS.flatMap((level) =>
    grammarNamed(level)
      .statements.filter((s) => s.clauses.some((c) => c.name === 'at'))
      .map((s) => ({ level, keyword: s.keyword })),
  ).filter((e, i, all) => all.findIndex((o) => o.keyword === e.keyword) === i);
  const arrow = fieldOf(edge.arguments, 'arrow');
  const section = (id: string, title: string, doc: string, tiles: TileSource[], wide = false): Section => ({
    id,
    title,
    doc,
    wide,
    tiles: tiles.map(draw),
  });
  return [
    section(
      'elements',
      'Elements',
      'What each C4 level places in its grid; `node` is the neutral one every level has.',
      elements.map((e) => single(e.level, look, e.keyword, e.keyword, '')),
    ),
    section('shapes', 'Shapes', docOf('shape'), [
      single(SHARED, look, 'node', 'box', ''),
      ...values('shape').map((v) => single(SHARED, look, 'node', v, ` shape=${v}`)),
    ]),
    section(
      'icons',
      'Icons',
      `${docOf('icon')} Lucide pictograms and a few brand marks of Simple Icons, licences in NOTICE.`,
      values('icon').map((v) => single(SHARED, look, 'node', v, ` icon=${v}`)),
    ),
    section(
      'tones',
      'Tones',
      `On an element: ${docOf('tone')} On an edge: ${fieldOf(edge.attributes, 'tone').doc}`,
      values('tone').map((v) => toned(look, v)),
    ),
    section('status', 'Status and emphasis', `${docOf('status')} ${node.flags.map((f) => f.doc).join(' ')}`, [
      single(SHARED, look, 'node', 'default', ''),
      ...values('status').map((v) => single(SHARED, look, 'node', v, ` status=${v}`)),
      ...node.flags.map((f) => single(SHARED, look, 'node', f.name, ` ${f.name}`)),
      single(SHARED, look, 'node', 'replicas=3', ' replicas=3'),
    ]),
    section(
      'arrows',
      'Arrows',
      'The arrow of an edge or a flow step says what kind of connection it is, and decides how it is drawn.',
      (arrow.choices ?? []).map((a) => arrowTile(look, a, arrow.meanings?.[a] ?? a)),
      true,
    ),
    section(
      'flows',
      'Flows',
      flow.doc,
      flow.flags.map((f) => flowTile(look, f.name)),
      true,
    ),
    section(
      'frames',
      'Frames',
      group.doc,
      group.flags.map((f) => frameTile(look, f.name)),
      true,
    ),
    section(
      'forms',
      'Forms of cards',
      docOf('form'),
      values('form').map((v) => single(SHARED, look, 'node', v, ` form=${v}`)),
    ),
  ];
}
