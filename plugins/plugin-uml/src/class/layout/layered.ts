import { STANDARD_FONTS, textWidth } from '@diagrist/core';
import {
  type GraphContainer,
  type GraphEdge,
  type GraphNode,
  type GraphRank,
  type LayoutGraph,
  WRAP_EM,
  wrapWithin,
} from '@diagrist/layout-grid';
import type { ClassRelation } from '../diagram.js';
import type { ClassModel } from '../model.js';
import { packagesAround } from '../model.js';
import { classHeight, classWidth } from './box.js';
import { legOf, ranksOf } from './graph.js';
import { crossEnds, HEAD_AT_END, HEAD_AT_START, headLength } from './heads.js';
import { CLASS, CLASS_FONTS as F, LAYERED, tabWidth } from './metrics.js';
import { tethered, tetherPieces } from './tethered.js';

/** Air between a name and the end texts beside it, and between an end text and the next thing along the line. */
const AIR = 16;

/**
 * Solid lines of a hierarchy, superclass over subclass and whole over part: they stand straight and their ends above
 * each other first. Realizations and dependencies give way to them; dependencies, dashed, are soft lines that boxes
 * do not leave their parents for.
 */
const HIERARCHY: ReadonlySet<ClassRelation['kind']> = new Set(['generalization', 'composition', 'aggregation']);

/** Id of the edge of the relation at `index` in source order. */
export const edgeId = (index: number): string => `rel-${index}`;

/** Multiplicity and role at one end of a relation. */
const endTexts = (r: ClassRelation, end: 'from' | 'to'): (string | undefined)[] =>
  end === 'to' ? [r.card, r.role] : [r.source, r.srole];

/** Room the symbol and the x at one end take along the line. */
function endBack(r: ClassRelation, end: 'from' | 'to'): number {
  const x = crossEnds(r);
  const crossed = end === 'to' ? x.end : x.start;
  const head = headLength((end === 'to' ? HEAD_AT_END : HEAD_AT_START)[r.kind]);
  return head + (crossed ? CLASS.crossAt + CLASS.crossArm : 0) + CLASS.endGap;
}

/** Width of the texts at one end with the symbol in front of them. */
function endWidth(r: ClassRelation, end: 'from' | 'to'): number {
  const widest = Math.max(0, ...endTexts(r, end).map((t) => (t ? textWidth(t, F.label) : 0)));
  return endBack(r, end) + widest;
}

/** Straight run a vertical line needs at one end: the symbol, then the texts beside it with air. */
function endRun(r: ClassRelation, end: 'from' | 'to'): number {
  const texts = endTexts(r, end).some((t) => t !== undefined);
  return endBack(r, end) + (texts ? F.label.size + 2 + AIR : 0);
}

/** The words on a relation: its name, and its keyword in guillemets. */
export function nameOf(r: ClassRelation): string | undefined {
  const words = [r.keyword ? `«${r.keyword}»` : undefined, r.label].filter((w): w is string => w !== undefined);
  return words.length > 0 ? words.join(' ') : undefined;
}

/**
 * The lines of a relation's words as they stand beside it: where they run wider than the wrap of line texts
 * (`WRAP_EM`), a keyword in guillemets at their start, such as `«bind»`, on a line of its own and the rest broken
 * between its words as needed; one line otherwise.
 */
export function nameLines(r: ClassRelation): { text: string; width: number }[] {
  const font = STANDARD_FONTS.label;
  const measure = (t: string) => textWidth(t, font);
  const max = WRAP_EM * font.size;
  const name = nameOf(r);
  if (name === undefined) return [];
  const keyword = /^(«[^»]+»)\s+(.+)$/.exec(name);
  const lines =
    measure(name) <= max
      ? [name]
      : keyword
        ? [keyword[1] as string, ...wrapWithin(keyword[2] as string, max, measure)]
        : wrapWithin(name, max, measure);
  return lines.map((text) => ({ text, width: measure(text) }));
}

/**
 * How a relation runs between the layers: the head where UML wants it, a common trunk for generalizations and
 * realizations of one target (a shared triangle), which may stand below its sources where that clearly saves
 * crossings, and for the legs below one diamond, straight runs long enough
 * for the symbols and texts at both ends, and room for both when it runs beside.
 */
function edgeOf(m: ClassModel, r: ClassRelation, i: number, rank: GraphRank): GraphEdge {
  const shared = r.kind === 'generalization' || r.kind === 'realization' ? `${r.kind}:${r.to}` : undefined;
  const leg = legOf(m, r);
  const name = nameOf(r);
  const font = STANDARD_FONTS.label;
  const lines = nameLines(r);
  const named = Math.max(0, ...lines.map((l) => l.width));
  const room = 2 * Math.max(endWidth(r, 'from'), endWidth(r, 'to')) + named + 2 * AIR;
  return {
    id: edgeId(i),
    from: r.from,
    to: r.to,
    rank,
    ...(HIERARCHY.has(r.kind) ? { weight: 2 } : {}),
    ...(r.kind === 'dependency' ? { strength: 'soft' as const } : {}),
    ...(shared
      ? { bundle: shared, trunk: 'whole' as const, either: true }
      : leg
        ? { bundle: `leg:${leg.diamond}` }
        : {}),
    run: {
      from: endRun(r, 'from') + (name === undefined ? 0 : lines.length * (font.size + 2) + LAYERED.labelGap),
      to: endRun(r, 'to'),
    },
    room: Math.ceil(room / CLASS.grid) * CLASS.grid,
    ...(name === undefined
      ? {}
      : { label: { text: name, width: named, size: font.size, ...(lines.length > 1 ? { lines } : {}) } }),
    source: r.span,
  };
}

/** Lines that are never drawn: a class hung above the diamond of its n-ary association. */
function tethers(m: ClassModel, placed: ReadonlySet<string>): GraphEdge[] {
  return m.diagram.associations.flatMap((a): GraphEdge[] =>
    a.via !== undefined && placed.has(a.via) && placed.has(a.id)
      ? [{ id: `via-${a.id}`, from: a.via, to: a.id, rank: 'down', hidden: true }]
      : [],
  );
}

/** Packages that hold something placed, each as a frame with its tab as the head, nested in its parent. */
function framesOf(m: ClassModel, placed: ReadonlySet<string>): GraphContainer[] {
  const filled = new Set([...placed].flatMap((id) => packagesAround(m, id)));
  const home = (id: string) => m.classifiers.get(id)?.package ?? m.associations.get(id)?.package;
  return m.diagram.packages.flatMap((p): GraphContainer[] =>
    filled.has(p.id) && m.packages.get(p.id) === p
      ? [
          {
            id: p.id,
            kind: 'frame',
            members: [...placed].filter((id) => home(id) === p.id),
            ...(p.parent !== undefined && filled.has(p.parent) ? { parent: p.parent } : {}),
            pad: CLASS.packageSide,
            top: CLASS.tabH + CLASS.packagePad,
            head: { width: tabWidth(p.label), height: CLASS.tabH },
            tab: true,
          },
        ]
      : [],
  );
}

/**
 * A class diagram as a layout graph: classifiers and diamonds as nodes, packages as frames with their tab as the
 * head, every relation as an edge ranked by its kind (`ranksOf`), lines with a package at an end and of a classifier
 * with itself among them, and the lines never drawn that hang an association class below its line. Layers take free
 * ranks and hold every package as a block, no layer over `CLASS.perLayer` classes.
 */
export function classGraph(m: ClassModel): LayoutGraph {
  const nodes = [
    ...m.diagram.classifiers.map((c) => ({ id: c.id, width: classWidth(c), height: classHeight(c), source: c.span })),
    ...m.diagram.associations.map((a) => ({ id: a.id, width: CLASS.naryW, height: CLASS.naryH, source: a.span })),
  ].map((b): GraphNode => {
    const cluster = packagesAround(m, b.id)[0];
    return cluster === undefined ? b : { ...b, cluster };
  });
  const placed = new Set(nodes.map((n) => n.id));
  const frames = framesOf(m, placed);
  const ends = new Set([...placed, ...frames.map((f) => f.id)]);
  const rank = ranksOf(m);
  const points = new Map<string, GraphNode[]>();
  const edges = m.diagram.relations.flatMap((r, i) => {
    if (!ends.has(r.from) || !ends.has(r.to)) return [];
    const edge = edgeOf(m, r, i, rank(r));
    if (!tethered(r, placed)) return [edge];
    const pieces = tetherPieces(edge, i, r.via);
    points.set(r.from, [...(points.get(r.from) ?? []), pieces.node]);
    return pieces.edges;
  });
  return {
    nodes: nodes.flatMap((n) => [n, ...(points.get(n.id) ?? [])]),
    edges: [...edges, ...tethers(m, placed)],
    containers: frames,
    given: { perLayer: CLASS.perLayer },
    metrics: { ...LAYERED, top: frames.length > 0 ? LAYERED.top - CLASS.tabH - CLASS.packagePad : LAYERED.top },
  };
}
