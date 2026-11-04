import { STANDARD_FONTS, textWidth } from '@diagrist/core';
import type { LayeredEdge, LayeredFrame, LayeredNode, LayeredSpec } from '@diagrist/layout-grid';
import type { ClassRelation } from '../diagram.js';
import type { ClassModel } from '../model.js';
import { packagesAround } from '../model.js';
import type { Cell } from './blocks.js';
import { classHeight, classWidth } from './box.js';
import { legOf } from './graph.js';
import { crossEnds, HEAD_AT_END, HEAD_AT_START, headLength } from './heads.js';
import { CLASS, CLASS_FONTS as F, LAYERED, tabWidth } from './metrics.js';

/** Air between a name and the end texts beside it, and between an end text and the next thing along the line. */
const AIR = 16;

/**
 * Solid lines of a hierarchy, superclass over subclass and whole over part: they stand straight and their ends above
 * each other first. Realizations and dependencies give way to them.
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
 * How a relation runs between the layers: the head where UML wants it, a common trunk for generalizations and
 * realizations of one target (a shared triangle) and for the legs below one diamond, straight runs long enough
 * for the symbols and texts at both ends, and room for both when it runs beside.
 */
function edgeOf(m: ClassModel, r: ClassRelation, i: number): LayeredEdge {
  const shared = r.kind === 'generalization' || r.kind === 'realization' ? `${r.kind}:${r.to}` : undefined;
  const leg = legOf(m, r);
  const name = nameOf(r);
  const font = STANDARD_FONTS.label;
  const named = name === undefined ? 0 : textWidth(name, font);
  const room = 2 * Math.max(endWidth(r, 'from'), endWidth(r, 'to')) + named + 2 * AIR;
  return {
    id: edgeId(i),
    from: r.from,
    to: r.to,
    rank: 1,
    ...(HIERARCHY.has(r.kind) ? { weight: 2 } : {}),
    ...(shared ? { bundle: shared } : leg ? { bundle: `leg:${leg.diamond}` } : {}),
    run: { from: endRun(r, 'from') + (name === undefined ? 0 : font.size + 2 + LAYERED.labelGap), to: endRun(r, 'to') },
    room: Math.ceil(room / CLASS.grid) * CLASS.grid,
    ...(name === undefined ? {} : { label: { text: name, width: named, size: font.size } }),
    source: r.span,
  };
}

/** Lines that are never drawn: a class hung below the line of its association, or above its diamond. */
function tethers(m: ClassModel, placed: ReadonlySet<string>): LayeredEdge[] {
  const binary = m.diagram.relations.flatMap((r, i): LayeredEdge[] =>
    r.via !== undefined && placed.has(r.via) && placed.has(r.from) && placed.has(r.to)
      ? [r.from, r.to].map((end, k) => ({ id: `via-${i}-${k}`, from: end, to: r.via as string, rank: 1, hidden: true }))
      : [],
  );
  const nary = m.diagram.associations.flatMap((a): LayeredEdge[] =>
    a.via !== undefined && placed.has(a.via) && placed.has(a.id)
      ? [{ id: `via-${a.id}`, from: a.via, to: a.id, rank: 1, hidden: true }]
      : [],
  );
  return [...binary, ...nary];
}

/** Packages that hold something placed, each as a frame with its tab as the head, nested in its parent. */
function framesOf(m: ClassModel, placed: ReadonlySet<string>): LayeredFrame[] {
  const filled = new Set([...placed].flatMap((id) => packagesAround(m, id)));
  const home = (id: string) => m.classifiers.get(id)?.package ?? m.associations.get(id)?.package;
  return m.diagram.packages.flatMap((p): LayeredFrame[] =>
    filled.has(p.id) && m.packages.get(p.id) === p
      ? [
          {
            id: p.id,
            members: [...placed].filter((id) => home(id) === p.id),
            ...(p.parent !== undefined && filled.has(p.parent) ? { parent: p.parent } : {}),
            pad: CLASS.packageSide,
            top: CLASS.tabH + CLASS.packagePad,
            head: { width: tabWidth(p.label), height: CLASS.tabH },
          },
        ]
      : [],
  );
}

/**
 * A class diagram as a layered picture: classifiers and diamonds in the layers and order of the automatic grid
 * (`cells`), relations between them as edges, packages as frames. Relations with a package at an end and those of a
 * classifier with itself are drawn by the kind.
 */
export function classLayered(m: ClassModel, cells: ReadonlyMap<string, Cell>): LayeredSpec {
  const boxes = [
    ...m.diagram.classifiers.map((c) => ({ id: c.id, width: classWidth(c), height: classHeight(c), source: c.span })),
    ...m.diagram.associations.map((a) => ({ id: a.id, width: CLASS.naryW, height: CLASS.naryH, source: a.span })),
  ].filter((b) => cells.has(b.id));
  const placed = new Set(boxes.map((b) => b.id));
  const nodes = boxes.map((b): LayeredNode => {
    const cluster = packagesAround(m, b.id)[0];
    return cluster === undefined ? b : { ...b, cluster };
  });
  const rows = [...new Set([...cells.values()].map((c) => c.row))].sort((a, b) => a - b);
  const layers = rows.map((row) =>
    [...placed]
      .filter((id) => cells.get(id)?.row === row)
      .sort((a, b) => (cells.get(a)?.cross ?? 0) - (cells.get(b)?.cross ?? 0)),
  );
  const edges = m.diagram.relations.flatMap((r, i) =>
    r.from !== r.to && placed.has(r.from) && placed.has(r.to) ? [edgeOf(m, r, i)] : [],
  );
  const frames = framesOf(m, placed);
  return {
    nodes,
    edges: [...edges, ...tethers(m, placed)],
    metrics: { ...LAYERED, top: frames.length > 0 ? LAYERED.top - CLASS.tabH - CLASS.packagePad : LAYERED.top },
    layers,
    ...(frames.length > 0 ? { frames } : {}),
  };
}
