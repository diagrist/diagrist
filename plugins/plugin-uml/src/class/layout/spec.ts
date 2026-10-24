import { textWidth } from '@diagrist/core';
import type { GridEdge, GridGroup, GridNode, GridSpec } from '@diagrist/layout-grid';
import type { ClassRelation } from '../diagram.js';
import type { ClassModel } from '../model.js';
import { classHeight, classWidth } from './box.js';
import type { Cell } from './cells.js';
import { HEAD_AT_END, HEAD_AT_START, headLength } from './heads.js';
import { CLASS, classMetrics, CLASS_FONTS as F, tabWidth } from './metrics.js';
import { packageExtents, packageRowGap } from './packages.js';

/** Air between a name and the end texts beside it. */
const AIR = 16;

/** Id of the edge of the relation at `index` in source order. */
export const edgeId = (index: number): string => `rel-${index}`;

/** Width of the texts at one end with the symbol in front of them. */
function endWidth(r: ClassRelation, end: 'from' | 'to'): number {
  const texts = end === 'to' ? [r.card, r.role] : [r.source, r.srole];
  const head = headLength((end === 'to' ? HEAD_AT_END : HEAD_AT_START)[r.kind]);
  const widest = Math.max(0, ...texts.map((t) => (t ? textWidth(t, F.label) : 0)));
  return widest ? head + CLASS.endGap + widest : head;
}

/**
 * Gap between columns: wide enough for the name, multiplicities and roles of a horizontal relation side by side, at
 * least the theme's gap. One value for all gaps keeps the grid calm.
 */
function columnGap(m: ClassModel, cells: ReadonlyMap<string, Cell>): number {
  const row = (id: string) => cells.get(id)?.row;
  const needs = m.diagram.relations
    .filter((r) => r.from !== r.to && row(r.from) !== undefined && row(r.from) === row(r.to))
    .map((r) => {
      const label = r.label ?? m.associations.get(r.from)?.label ?? m.associations.get(r.to)?.label;
      const name = label ? textWidth(label, F.label) : 0;
      return 2 * Math.max(endWidth(r, 'from'), endWidth(r, 'to')) + name + 2 * AIR;
    });
  return Math.ceil(Math.max(CLASS.colGap, ...needs) / CLASS.grid) * CLASS.grid;
}

/** How far the loop of a relation with itself reaches: far enough for the texts at its horizontal start. */
function loopReach(r: ClassRelation): number {
  const texts = [r.source, r.srole].filter((x): x is string => x !== undefined);
  const widest = Math.max(0, ...texts.map((x) => textWidth(x, F.label)));
  return Math.max(CLASS.loopReach, Math.ceil((CLASS.endGap + widest + AIR) / CLASS.grid) * CLASS.grid);
}

/** Generalizations and realizations with the same target share one triangle (shared target style). */
function bundles(m: ClassModel): Map<ClassRelation, string> {
  const groups = new Map<string, ClassRelation[]>();
  for (const r of m.diagram.relations) {
    if ((r.kind !== 'generalization' && r.kind !== 'realization') || r.from === r.to) continue;
    const key = `${r.kind}:${r.to}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return new Map([...groups].flatMap(([key, list]) => (list.length > 1 ? list.map((r) => [r, key] as const) : [])));
}

/**
 * The grid spec of a class diagram: half columns and layers of the automatic grid (`cells`), classifiers and diamonds with their
 * own measures, packages as frames around their members, relations as orthogonal edges.
 */
export function classGridSpec(m: ClassModel, cells: ReadonlyMap<string, Cell>): GridSpec {
  const crosses = [...new Set([...cells.values()].flatMap((c) => [c.cross, c.cross + 1]))].sort((a, b) => a - b);
  const rows = [...new Set([...cells.values()].map((c) => c.row))].sort((a, b) => a - b);
  const col = (c: number) => `c${crosses.indexOf(c) + 1}`;
  const row = (r: number) => `r${rows.indexOf(r) + 1}`;
  const node = (id: string, w: number, h: number, source: GridNode['source']): GridNode[] => {
    const at = cells.get(id);
    if (!at) return [];
    const to = { col: col(at.cross + 1) };
    return [{ id, col: col(at.cross), row: row(at.row), to, width: w, height: h, shape: 'box', source }];
  };
  const nodes = [
    ...m.diagram.classifiers.flatMap((c) => node(c.id, classWidth(c), classHeight(c), c.span)),
    ...m.diagram.associations.flatMap((a) => node(a.id, CLASS.naryW, CLASS.naryH, a.span)),
  ];
  const placed = new Set(nodes.map((n) => n.id));
  const members = (p: string) =>
    nodes.filter((n) => (m.classifiers.get(n.id) ?? m.associations.get(n.id))?.package === p);
  const pads = { top: CLASS.tabH + CLASS.packagePad, bottom: 24, left: 24, right: 24 };
  const filled = new Set<string>();
  for (const n of nodes) {
    const owner = m.classifiers.get(n.id)?.package ?? m.associations.get(n.id)?.package;
    for (let p = owner; p !== undefined && m.packages.has(p) && !filled.has(p); p = m.packages.get(p)?.parent)
      filled.add(p);
  }
  const groups = m.diagram.packages.flatMap((p): GridGroup[] =>
    filled.has(p.id)
      ? [
          {
            id: p.id,
            ...(p.parent !== undefined && filled.has(p.parent) ? { parent: p.parent } : {}),
            members: members(p.id).map((n) => n.id),
            pads,
            minWidth: tabWidth(p.label),
            source: p.span,
          },
        ]
      : [],
  );
  const ends = new Set([...placed, ...groups.map((g) => g.id)]);
  const shared = bundles(m);
  const extents = packageExtents(m, cells);
  const edges = m.diagram.relations.flatMap((r, i): GridEdge[] => {
    if (!ends.has(r.from) || !ends.has(r.to)) return [];
    const bundle = shared.get(r);
    return [
      {
        id: edgeId(i),
        from: r.from,
        to: r.to,
        ...(bundle ? { bundle } : {}),
        ...(r.from === r.to ? { loopReach: loopReach(r) } : {}),
        source: r.span,
      },
    ];
  });
  return {
    cols: crosses.map((c) => ({ name: col(c), width: 0 })),
    rows: rows.map((r) => {
      const gap = packageRowGap(extents, r);
      return gap ? { name: row(r), gap } : { name: row(r) };
    }),
    nodes,
    groups,
    edges,
    metrics: classMetrics(columnGap(m, cells), groups.length > 0),
    adaptive: true,
  };
}
