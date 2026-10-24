import { textWidth } from '@diagrist/core';
import type { GridGroup, GridNode, GridSpec, Pads } from '@diagrist/layout-grid';
import { frameOf, regionsOf, type StateModel } from '../model.js';
import { stateHeight, stateLines, stateWidth } from './box.js';
import type { Cell } from './cells.js';
import { stateColumnGap, stateRowGap } from './gaps.js';
import { STATE_FONTS as F, STATE as S, stateMetrics } from './metrics.js';

/** Id of the edge of the transition at `index` in source order. */
export const edgeId = (index: number): string => `go-${index}`;

/** Height of the name field and compartment of a composite state; below it its inside begins. */
export function compositeHead(m: StateModel, id: string): number {
  const v = m.vertices.get(id);
  const n = v ? stateLines(m, v).length : 0;
  return S.headH + (n ? 2 * S.sectionPad + n * S.lineH : 0);
}

/** Pads of a composite state: name field and compartment on top, the names of regions side by side below them. */
function pads(m: StateModel, id: string): Pads {
  const named = m.diagram.direction === 'down' && regionsOf(m, id).some((r) => m.vertices.get(r)?.label);
  const top = compositeHead(m, id) + (named ? S.regionNameH : 0) + S.padBottom;
  return { top, bottom: S.padBottom, left: S.padSide, right: S.padSide };
}

/** The frame of each composite state, its parent frame, and its first and last row in grid indices. */
function frames(m: StateModel, cells: ReadonlyMap<string, Cell>, row: (c: Cell) => number) {
  const out = new Map<string, readonly [number, number]>();
  for (const [id, c] of cells)
    for (let f = frameOf(m, m.vertices.get(id)?.parent); f !== undefined; f = frameOf(m, m.vertices.get(f)?.parent)) {
      const r = out.get(f);
      out.set(f, [Math.min(r?.[0] ?? row(c), row(c)), Math.max(r?.[1] ?? row(c), row(c))]);
      if (out.size > m.vertices.size) break;
    }
  return out;
}

/**
 * The grid spec of a state machine: layers and half places of the automatic grid, states and pseudostates with their
 * own measures, composite states as frames around their members, transitions as edges. `pads` grow frames on a second
 * run, `margin` widens the left margin for rails.
 */
export function stateGridSpec(
  m: StateModel,
  cells: ReadonlyMap<string, Cell>,
  grown: ReadonlyMap<string, Pads>,
  margin: number,
): GridSpec {
  const right = m.diagram.direction === 'right';
  const mains = [...new Set([...cells.values()].map((c) => c.main))].sort((a, b) => a - b);
  const crosses = [...new Set([...cells.values()].flatMap((c) => [c.cross, c.cross + 1]))].sort((a, b) => a - b);
  const mainName = (v: number) => `${right ? 'c' : 'r'}${mains.indexOf(v) + 1}`;
  const crossName = (v: number) => `${right ? 'r' : 'c'}${crosses.indexOf(v) + 1}`;
  const rowIndex = (c: Cell) => (right ? crosses.indexOf(c.cross) : mains.indexOf(c.main));
  const colIndex = (c: Cell) => (right ? mains.indexOf(c.main) : crosses.indexOf(c.cross));
  const at = (id: string) => {
    const c = cells.get(id);
    return c ? { col: colIndex(c), row: rowIndex(c) } : undefined;
  };
  const nodes = [...cells].flatMap(([id, c]): GridNode[] => {
    const v = m.vertices.get(id);
    if (!v) return [];
    const [w, h] = [stateWidth(m, v), stateHeight(m, v)];
    const [main, from, to] = [mainName(c.main), crossName(c.cross), crossName(c.cross + 1)];
    const place = right ? { col: main, row: from, to: { row: to } } : { col: from, row: main, to: { col: to } };
    return [{ id, ...place, width: w, height: h, shape: 'box', source: v.span }];
  });
  const extents = frames(m, cells, rowIndex);
  const groups = m.diagram.vertices.flatMap((v): GridGroup[] => {
    if (!m.composites.has(v.id) || !extents.has(v.id)) return [];
    const members = nodes.filter((n) => frameOf(m, m.vertices.get(n.id)?.parent) === v.id).map((n) => n.id);
    const parent = frameOf(m, v.parent);
    const more = grown.get(v.id);
    const p = pads(m, v.id);
    const sum = more
      ? { top: p.top + more.top, bottom: p.bottom + more.bottom, left: p.left + more.left, right: p.right + more.right }
      : p;
    return [
      {
        id: v.id,
        ...(parent !== undefined ? { parent } : {}),
        members,
        pads: sum,
        minWidth: textWidth(v.label ?? '', F.name) + 2 * S.padX,
        source: v.span,
      },
    ];
  });
  const metrics = stateMetrics(stateColumnGap(m, at));
  const rowNames = right ? crosses.map(crossName) : mains.map(mainName);
  return {
    cols: (right ? mains.map(mainName) : crosses.map(crossName)).map((name) => ({ name, width: 0 })),
    rows: rowNames.map((name, i) => {
      const gap = stateRowGap(m, at, extents, i);
      return gap ? { name, gap } : { name };
    }),
    nodes,
    groups,
    edges: [],
    metrics: { ...metrics, marginX: metrics.marginX + margin },
    adaptive: true,
  };
}
